import type { Metadata } from "next";
import Link from "next/link";
import { getHistoricalSeasons, getSeasonSummaries } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";

export const metadata: Metadata = {
  title: "Seasons",
  description:
    "Every Minecraft Baseball League season since Season IV, with standings, playoffs and statistics for each.",
  alternates: { canonical: "/seasons" },
};

export const dynamic = "force-dynamic";

/**
 * The way into league history.
 *
 * This was a list of names, which said nothing about a season and gave no
 * reason to open one. Each season now shows how big it was, who won the most
 * games in it, and leads straight to its standings, statistics or rosters -
 * so the page answers "which season do I want" rather than just listing them.
 */
export default async function SeasonsPage() {
  const seasons = await getHistoricalSeasons();
  const summaries = await getSeasonSummaries();
  const summaryFor = new Map(summaries.map((row) => [row.seasonId, row]));

  return (
    <PageShell title="Seasons" subtitle="Every season in league history.">
      {seasons.length === 0 ? (
        <EmptyState>No seasons have been recorded yet.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => {
            const summary = summaryFor.get(season.id);
            // "MBL Season XII Playoffs" reads as "XII" once the page has said
            // these are all MBL seasons, and the playoffs get their own chip.
            const numeral = season.name.replace(/^MBL Season\s*/i, "").replace(/\s*Playoffs$/i, "");
            return (
              <li key={season.id}>
                <Link
                  href={`/seasons/${season.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 transition-colors hover:border-sky-500/50 hover:bg-slate-800/50"
                >
                  {/* The club that won the most games, as a faint backdrop. */}
                  {summary?.leaderName && (
                    <TeamLogo
                      teamName={summary.leaderName}
                      className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 opacity-[0.07] transition-opacity group-hover:opacity-[0.13]"
                    />
                  )}

                  <div className="relative flex items-baseline gap-2">
                    <span className="text-2xl font-black tracking-tight text-slate-100">{numeral}</span>
                    {season.isPlayoffs && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Playoffs
                      </span>
                    )}
                  </div>

                  <p className="relative mt-0.5 text-xs text-slate-500">
                    {summary
                      ? `${summary.teams} clubs · ${summary.played} of ${summary.games} games played`
                      : "No games recorded"}
                  </p>

                  {summary?.leaderName && (
                    <p className="relative mt-3 flex items-center gap-2 text-sm text-slate-300">
                      <TeamLogo teamName={summary.leaderName} className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 truncate">{summary.leaderName}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-slate-500">
                        {summary.leaderWins}-{summary.leaderLosses}
                      </span>
                    </p>
                  )}

                  <span className="relative mt-3 text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                    Open season →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
