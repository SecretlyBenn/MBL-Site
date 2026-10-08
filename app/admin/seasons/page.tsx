import type { Metadata } from "next";
import { desc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  historicalGames,
  historicalPlayerStats,
  historicalRosterEntries,
  historicalSeasons,
} from "@/db/schema";
import { currentSeasonName } from "@/db/settings";
import { getLeagues } from "@/db/queries";
import { requireRole } from "@/app/roles";
import { SectionHeader } from "@/app/SiteNav";
import { CreateSeasonForm, CurrentSeasonForm, RecomputeSeasonForm } from "../AdminForms";
import { DeleteButton } from "../ui";

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

  // Which seasons still hold nothing, so the page only offers to delete one of
  // those. The server decides either way; this is so an admin is not shown a
  // button that will refuse.
  //
  // Asked only of the seasons that could possibly qualify - the ones with no
  // games, which the tally above already names - rather than of the archive as
  // a whole. Counting every season's roster entries meant reading all 4,444 of
  // them on every load of this page to answer what is really a yes or no about
  // one empty season, and a GROUP BY over the whole table visits every row
  // whatever indexes exist. Restricted to a handful of ids it goes through
  // historical_roster_entries_season_idx instead, and in the ordinary case
  // where nothing is deletable it is not asked at all.
  const candidates = seasons
    .filter((season) => !isCurrent(season) && Number(tallyFor.get(season.id)?.total ?? 0) === 0)
    .map((season) => season.id);
  const [withTotals, withRosters] = candidates.length
    ? await Promise.all([
        db
          .selectDistinct({ seasonId: historicalPlayerStats.seasonId })
          .from(historicalPlayerStats)
          .where(inArray(historicalPlayerStats.seasonId, candidates)),
        db
          .selectDistinct({ seasonId: historicalRosterEntries.seasonId })
          .from(historicalRosterEntries)
          .where(inArray(historicalRosterEntries.seasonId, candidates)),
      ])
    : [[], []];
  // A season is only removable while it is still empty. The clubs entered when
  // it was created do not count - they are standings for games nobody played.
  const occupied = new Set([
    ...withTotals.map((row) => row.seasonId),
    ...withRosters.map((row) => row.seasonId),
  ]);
  const candidateIds = new Set(candidates);
  const holdsNothing = (season: { id: number }) =>
    candidateIds.has(season.id) && !occupied.has(season.id);

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
                <th className="px-3 py-2" />
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
                    <td className="px-3 py-2 text-right">
                      {holdsNothing(season) && (
                        <DeleteButton
                          url={`/api/seasons?seasonId=${season.id}`}
                          confirmText={`Delete ${season.name}? It holds no games, player totals or roster entries, and the clubs entered at 0-0 go with it.`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Why most rows have no button. Saying it here is kinder than letting
            an admin hunt for one that was never going to be there. */}
        <p className="mt-2 text-xs text-slate-500">
          A season can be deleted only while it still holds nothing - no games, no player totals, no
          roster entries, and not the one being played. Everything in the archive hangs off a season,
          so one with history in it is kept whatever else is true of it.
        </p>
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
