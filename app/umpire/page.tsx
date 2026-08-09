import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { games, scorecards, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { PageShell, EmptyState } from "@/app/SiteNav";
import { StartGameForm } from "./StartGameForm";

export const dynamic = "force-dynamic";

export default async function UmpirePage() {
  const leagueUser = await requireRole(["UMPIRE", "HEAD_UMPIRE", "ADMIN"], "/umpire");

  const db = getDb();
  const allTeams = await db.select().from(teams).orderBy(teams.name);
  const teamById = new Map(allTeams.map((team) => [team.id, team]));

  // Anything already being scored, so an umpire can pick up where they left off
  // - a dropped connection should not cost a game.
  const open = await db
    .select({
      id: scorecards.id,
      status: scorecards.status,
      gameId: scorecards.gameId,
      homeScore: scorecards.homeScore,
      awayScore: scorecards.awayScore,
      awayTeamId: games.awayTeamId,
      homeTeamId: games.homeTeamId,
      scheduledAt: games.scheduledAt,
    })
    .from(scorecards)
    .innerJoin(games, eq(scorecards.gameId, games.id))
    .where(inArray(scorecards.status, ["IN_PROGRESS", "PENDING"]))
    .orderBy(desc(scorecards.id))
    .limit(20);

  return (
    <PageShell
      title="Umpire"
      subtitle={`${leagueUser.displayName} · ${leagueUser.role.replace("_", " ").toLowerCase()}`}
    >
      <section className="mb-8">
        <h2 className="section-title mb-3">Games being scored</h2>
        {open.length === 0 ? (
          <EmptyState>Nothing in progress. Start a game below.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {open.map((row) => (
              <Link
                key={row.id}
                href={`/umpire/${row.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 transition-colors hover:border-sky-600/50 hover:bg-slate-900"
              >
                <span className="font-semibold">
                  {teamById.get(row.awayTeamId)?.name ?? "Away"}{" "}
                  <span className="text-slate-500">at</span>{" "}
                  {teamById.get(row.homeTeamId)?.name ?? "Home"}
                </span>
                <span className="flex items-center gap-4 text-sm">
                  <span className="tabular-nums text-slate-300">
                    {row.awayScore} – {row.homeScore}
                  </span>
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    {row.status.replace("_", " ").toLowerCase()}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Start a game</h2>
        <StartGameForm teams={allTeams.map((team) => ({ id: team.id, name: team.name }))} />
      </section>
    </PageShell>
  );
}
