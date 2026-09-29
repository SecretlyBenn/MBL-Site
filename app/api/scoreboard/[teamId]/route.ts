import { getScoreboard } from "@/db/scoreboard";
import { apiError } from "@/app/api-errors";

/**
 * The live game at a club's ground, for the jumbotron in their stadium.
 *
 * Public and read-only: it names the two clubs, who is up, who is pitching and
 * who is on the bases. There is nothing here a reader could not already see on
 * the game's own page, and the caller is a Minecraft server rather than a
 * signed-in person, so there is no role to check.
 *
 * Meant to be polled by the *plugin*, once, on behalf of every player watching
 * - not by each player's client. A hundred thousand requests a day is the whole
 * site's budget on this plan, and twenty clients asking every second would
 * spend it in under two hours. See the comment in `JumbotronFeed.kt`.
 */
export async function GET(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const teamId = Number((await context.params).teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return Response.json({ error: "Not a club." }, { status: 400, headers: HEADERS });
    }

    const board = await getScoreboard(teamId, new URL(request.url).origin);

    // A club with no game on is not an error - it is the normal state of a
    // stadium, and the board shows its idle face rather than a failure.
    return Response.json({ live: board !== null, scoreboard: board }, { headers: HEADERS });
  } catch (error) {
    return apiError(error, "Could not read the scoreboard.");
  }
}

const HEADERS = {
  // Two seconds is shorter than anything a viewer would notice and long enough
  // that a burst of callers collapses into one read. The single-poller design
  // is the real protection; this is only a floor under a mistake.
  "Cache-Control": "public, s-maxage=2",
  // The bundled jumbotron page is a file:// document, which is a foreign origin
  // to every host. This is public data either way.
  "Access-Control-Allow-Origin": "*",
};

export const dynamic = "force-dynamic";
