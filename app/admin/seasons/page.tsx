import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { historicalGames, historicalSeasons } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { SectionHeader } from "@/app/SiteNav";
import { CreateSeasonForm, RecomputeSeasonForm } from "../AdminForms";

export const metadata: Metadata = { title: "Seasons" };
export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  await requireRole(["ADMIN"], "/admin/seasons");
  const db = getDb();

  const [seasons, tallies] = await Promise.all([
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="min-w-0">
        <SectionHeader title="Seasons" meta="Newest first - the top one is what public pages open on" />
        <div className="ui-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Season</th>
                <th className="px-3 py-2 text-right">Games</th>
                <th className="px-3 py-2 text-right">Played</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => {
                const tally = tallyFor.get(season.id);
                return (
                  <tr key={season.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-100">{season.name}</td>
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
        <CreateSeasonForm />
        <RecomputeSeasonForm seasons={seasons.map((season) => ({ id: season.id, name: season.name }))} />
      </aside>
    </div>
  );
}
