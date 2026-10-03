import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { historicalGames, historicalSeasons } from "@/db/schema";
import { currentSeasonName } from "@/db/settings";
import { getLeagues } from "@/db/queries";
import { requireRole } from "@/app/roles";
import { SectionHeader } from "@/app/SiteNav";
import { CreateSeasonForm, CurrentSeasonForm, RecomputeSeasonForm } from "../AdminForms";

export const metadata: Metadata = { title: "Seasons" };
export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  await requireRole(["ADMIN"], "/admin/seasons");
  const db = getDb();

  const allLeagues = await getLeagues();
  const [currents, seasons, tallies] = await Promise.all([
    // One per competition: the MBL and the MCBA run at the same time, so there
    // is no single season the site is playing.
    Promise.all(allLeagues.map((league) => currentSeasonName(league.slug))),
    db.select().from(historicalSeasons).orderBy(desc(historicalSeasons.sortOrder)),
    db
      .select({
        seasonId: historicalGames.seasonId,
        total: sql<number>`count(*)`,
        played: sql<number>`sum(case when ${historicalGames.homeScore} is not null then 1 else 0 end)`,
      })
      .from(historicalGames)
      .groupBy(historicalGames.seasonId),
  ]);
  const tallyFor = new Map(tallies.map((row) => [row.seasonId, row]));
  const leagueNameOf = new Map(allLeagues.map((league) => [league.id, league.name]));
  const currentOf = new Map(allLeagues.map((league, at) => [league.id, currents[at]]));
  const isCurrent = (season: { id: number; name: string; leagueId: number | null }) =>
    season.leagueId !== null && currentOf.get(season.leagueId) === season.name;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="min-w-0">
        <SectionHeader title="Seasons" meta="Newest first - the top one is what public pages open on" />
        <div className="ui-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Season</th>
                <th className="px-3 py-2">Competition</th>
                <th className="px-3 py-2 text-right">Games</th>
                <th className="px-3 py-2 text-right">Played</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => {
                const tally = tallyFor.get(season.id);
                return (
                  <tr key={season.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-100">
                      {season.name}
                      {season.isPlayoffs && (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          Postseason
                        </span>
                      )}
                      {isCurrent(season) && (
                        <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                          Playing now
                        </span>
                      )}
                    </td>
                    {/* A season belonging to no competition shows in neither
                        league's archive, so it is called out rather than left
                        blank and looking ordinary. */}
                    <td className="px-3 py-2 text-slate-300">
                      {season.leagueId === null
                        ? <span className="text-rose-400">No competition</span>
                        : leagueNameOf.get(season.leagueId) ?? <span className="text-rose-400">Unknown</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{Number(tally?.total ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{Number(tally?.played ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="flex flex-col gap-4">
        <CurrentSeasonForm
          leagues={allLeagues.map((league, at) => ({
            id: league.id,
            name: league.name,
            current: currents[at],
            // Only that competition's own seasons, so the MBL's cannot be set
            // as what the MCBA is playing.
            seasons: seasons
              .filter((season) => season.leagueId === league.id)
              .map((season) => ({ id: season.id, name: season.name })),
          }))}
        />
        <CreateSeasonForm leagues={allLeagues.map((league) => ({ id: league.id, name: league.name }))} />
        <RecomputeSeasonForm seasons={seasons.map((season) => ({ id: season.id, name: season.name }))} />
      </aside>
    </div>
  );
}
