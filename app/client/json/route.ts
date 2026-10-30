import { MODPACK } from "../modpack";

/**
 * The modpack list, for the Sports Launcher.
 *
 * The address matters more than the code: the launcher asks
 * `dl.minecraftbaseball.com/client/json` and nothing else, so whoever answers
 * that address decides what every player installs. Today it is a redirect to a
 * server outside the league, which is why a mod cannot be added without asking
 * somebody. Pointing that hostname here instead hands the league its own
 * modpack permanently, and the path has to stay exactly `/client/json` for
 * that to work - the launcher's copy of it is compiled in.
 *
 * Public and read-only, like the jumbotron feed. The caller is a launcher on
 * somebody's PC rather than a signed-in person, and the list is the same for
 * everyone, so there is nothing here to authenticate.
 *
 * The old server also answered `/client/mods` with a password-protected zip of
 * mods that were not on Modrinth. Version 0.4.5 of the launcher deleted the
 * code that reads it, so it is deliberately not reimplemented here; a mod the
 * league wants now has to be published to Modrinth like the other ten.
 */
export async function GET() {
  return Response.json(MODPACK, { headers: HEADERS });
}

const HEADERS = {
  // Every launcher asks on every start, and the answer is the same for all of
  // them, so this is cached at Cloudflare's edge rather than waking the Worker
  // each time - the free plan's budget is shared with the whole site. A minute
  // is short enough that adding a mod reaches everybody while you are still
  // watching, and long enough that a league-wide restart costs one read.
  "Cache-Control": "public, s-maxage=60",
};
