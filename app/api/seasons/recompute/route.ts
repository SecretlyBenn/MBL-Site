import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { historicalSeasons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recomputeSeason } from "@/db/publish";
import { RoleError, requireRoleForApi } from "@/app/roles";

type RecomputePayload = { seasonId: number };

/**
 * Rebuilds a season's team records and player totals from the per-game stats
 * already in the archive.
 *
 * Season totals and box scores are stored separately: approving a scorecard
 * updates both, but a season imported from the source site arrives as totals
 * first and box scores later, which leaves the totals describing only the games
 * that had been played when they were captured. This recomputes them from the
 * games on record, so an admin can repair that without a fresh import.
 */
export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const { seasonId } = (await request.json()) as RecomputePayload;

    if (!Number.isInteger(seasonId)) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }

    const db = getDb();
    const season = await db.query.historicalSeasons.findFirst({
      where: eq(historicalSeasons.id, seasonId),
    });
    if (!season) return Response.json({ error: "No such season" }, { status: 404 });

    await recomputeSeason(seasonId);

    await logAudit({
      actingUserId: leagueUser.id,
      action: "season.recompute",
      entityType: "season",
      entityId: seasonId,
      detail: { name: season.name },
    });

    return Response.json({ ok: true, season: season.name });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
