import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adoptCurrentName } from "@/db/adopt-name";
import { lookupAccounts } from "@/db/minecraft";
import { historicalPlayerStats, minecraftProfiles, players } from "@/db/schema";

/**
 * A head for a player whose account this site has not got on file.
 *
 * `/api/head/[uuid]` is what keeps every account current: it refreshes a skin
 * every six hours and notices a rename. It is keyed by the uuid, so a player
 * with no `minecraft_profiles` row cannot reach it - and a player with no row
 * is exactly the one who needs it. That left the only repair a hand-written
 * migration, twice (`drizzle/0113`, `0117`), for players whose single account
 * lookup at signing happened to come back empty.
 *
 * So this is the way in. `PlayerHead` points here when it has a name and no
 * uuid; the first time anybody loads a page he appears on, the account is
 * looked up, written down, and the browser is sent to the ordinary head. From
 * then on he is an ordinary player and this route is never asked about him
 * again - which is what makes the cost bounded rather than per-view.
 *
 * It is a redirect rather than the image itself so that the skin is still
 * served, and cached, by the one route that serves skins.
 */

/** A Minecraft name, so nothing else reaches the relay. */
const MINECRAFT_NAME = /^\w{3,16}$/;

/**
 * How long a browser keeps the answer that a name cannot be resolved.
 *
 * Most names with no account never will have one: the MCBA's seasons were
 * typed by hand and full of nicknames, and the league only required Discord
 * names to match in-game names from Season VII, so everything older is a
 * nickname that was never a username. Those are asked about once a week per
 * reader rather than once a page.
 */
const UNRESOLVED_CACHE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Nothing, in the shape of an image.
 *
 * A name that cannot be resolved has to answer with something an `<img>` will
 * accept, because the alternative is a broken-image icon in the middle of a
 * roster. One transparent pixel leaves the neutral box `PlayerHead` draws
 * behind it showing, which is the right answer for an unknown player - a
 * default skin would put a stranger's face there instead.
 */
const NOTHING = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4DwABBAEAX+XGAAAAAElFTkSuQmCC"),
  (character) => character.charCodeAt(0),
);

function nothing() {
  return new Response(NOTHING, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${UNRESOLVED_CACHE_SECONDS}`,
    },
  });
}

function toHead(uuid: string) {
  // Found, so every later request for this player goes straight to the head
  // route. Not cached: the answer is "ask over there", and over there is where
  // the caching belongs.
  return new Response(null, {
    status: 302,
    headers: { Location: `/api/head/${uuid}`, "Cache-Control": "no-store" },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name: raw } = await context.params;
  const name = decodeURIComponent(raw);
  if (!MINECRAFT_NAME.test(name)) return nothing();

  const db = getDb();

  // Already on file, which means PlayerHead was rendered from a page that had
  // not read the profile - cheaper to answer than to argue about.
  const [known] = await db
    .select({ uuid: minecraftProfiles.uuid })
    .from(minecraftProfiles)
    .where(eq(minecraftProfiles.playerName, name));
  if (known) return toHead(known.uuid);

  // Only somebody this site has heard of.
  //
  // This route is public, unauthenticated, and writes a row when it resolves a
  // name - so without this it is an invitation to feed it real Minecraft
  // usernames and have the site file a profile for each one, which spends the
  // day's D1 writes and fills the table with people who have never played
  // here. The player pool is everybody who has ever played (0099 filled it
  // from the archive), so a name that is not in it is not a name this site
  // ever needs a head for.
  // The live pool first, because that is one indexed row for almost everybody
  // and covers every current player. The archive second, and only when the
  // pool misses: a handful of names appear in a season without ever having
  // been given a live row, and they are still the league's own men.
  const [inPool] = await db
    .select({ name: players.displayName })
    .from(players)
    .where(eq(players.displayName, name));
  if (!inPool) {
    const [played] = await db
      .select({ name: historicalPlayerStats.playerName })
      .from(historicalPlayerStats)
      .where(eq(historicalPlayerStats.playerName, name))
      .limit(1);
    if (!played) return nothing();
  }

  let account: { uuid: string; name: string } | undefined;
  try {
    const { found } = await lookupAccounts([name]);
    account = found.get(name.toLowerCase());
  } catch {
    // The relay being busy is not an answer about this player, so it must not
    // be cached as one. A short window stops a page of unknown names retrying
    // in a loop while it is down.
    return new Response(NOTHING, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
    });
  }
  if (!account) return nothing();

  // The account may already be on file under the name he went by before, which
  // is a rename that split him in two. `adoptCurrentName` merges that rather
  // than refusing it, and moves the profile onto this name in the process.
  if ((await adoptCurrentName(account.uuid, name)) !== "renamed") {
    await db
      .insert(minecraftProfiles)
      .values({
        playerName: name,
        uuid: account.uuid,
        currentName: account.name,
        source: "mojang",
      })
      // A name already on file is left exactly as it is. A wrong answer here
      // would be hard to spot, so it never overwrites.
      .onConflictDoNothing();
  }

  return toHead(account.uuid);
}
