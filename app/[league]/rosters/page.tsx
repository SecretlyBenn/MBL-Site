import Link from "next/link";
import { BackButton } from "@/app/BackButton";
import { RosterStatsTable } from "./RosterStatsTable";
import { RosterSections } from "./RosterSections";
import styles from "./rosters.module.css";
import type { Metadata } from "next";
import {
  getHistoricalSchedule,
  getHistoricalSeasonStandings,
  getHistoricalSeasons,
  getHistoricalTeamRoster,
  getAvatarsFor,
} from "@/db/queries";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";

import { TeamLogo } from "@/app/TeamLogo";


import { RosterSelect } from "./RosterSelect";
import { leagueFrom } from "../league";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Rosters",
    description:
      "Minecraft Baseball League team rosters by season: every player, their positions and their season statistics.",
    alternates: { canonical: `/${league}/rosters` },
  };
}

export const dynamic = "force-dynamic";

export default async function RostersPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string; team?: string }>;
}) {
  const league = await leagueFrom(params);
  const { season: seasonParam, team: teamParam } = await searchParams;
  const seasons = await getHistoricalSeasons(league.id);
  if (seasons.length === 0) {
    return (
      <PageShell title="Rosters">
        <div className="mb-4"><BackButton /></div>
        <EmptyState>No seasons have been recorded yet.</EmptyState>
      </PageShell>
    );
  }

  const season = seasons.find((row) => String(row.id) === seasonParam) ?? seasons[0];
  const teams = await getHistoricalSeasonStandings(season.id);
  const team = teams.find((row) => String(row.id) === teamParam) ?? teams[0];
  const [roster, schedule] = team
    ? await Promise.all([
        getHistoricalTeamRoster(team.id),
        getHistoricalSchedule(season.id, team.id),
      ])
    : [[], []];
  // Only the heads this page draws: reading every profile in the league to
  // show one roster cost 603 rows a page view.
  const avatars = await getAvatarsFor(roster.map((row) => row.playerName));

  const wins = team?.wins ?? 0;
  const losses = team?.losses ?? 0;
  // A listed roster member may not have appeared in a game. Keep those
  // players in the main roster table and show a complete zero stat line.
  const batters = roster;
  const pitchers = roster.filter((row) => (row.inningsPitched ?? 0) > 0);

  return (
    <PageShell wide title="Rosters" subtitle={season.name}>
      <div className={styles.page}>
      <div className={styles.toolbar}>
      <BackButton />
      <div className={styles.filters}>
        <RosterSelect
          label="Season"
          param="season"
          options={seasons.map((row) => ({ id: row.id, name: row.name }))}
          selected={String(season.id)}
          resetParam="team"
        />
        {teams.length > 0 && team && (
          <RosterSelect
            label="Team"
            param="team"
            options={teams.map((row) => ({ id: row.id, name: row.name }))}
            selected={String(team.id)}
          />
        )}
      </div>
      </div>

      {!team ? (
        <EmptyState>No teams recorded for this season.</EmptyState>
      ) : (
        <>
          <div className={styles.hero}>
            <TeamLogo teamName={team.name} className="pointer-events-none absolute -right-8 -top-10 h-64 w-64 opacity-[0.05]" />
            <div className={styles.identity}>
              <div className={styles.crest}><TeamLogo teamName={team.name} className="h-full w-full" /></div>
              <div className="min-w-0">
                <p className={styles.eyebrow}>{season.name}{team.league ? ` · ${team.league === "AMERICAN" ? "American" : "National"} League` : ""}</p>
                <h2 className={styles.name}>{team.name}</h2>
              </div>
            </div>
            <dl className={styles.metrics}>
              {[
                { label: "Record", value: `${wins}–${losses}${team.ties ? `–${team.ties}` : ""}` },
                { label: "Win percentage", value: wins + losses ? (wins / (wins + losses)).toFixed(3).replace(/^0/, "") : "—" },
                { label: "Runs scored", value: team.runsScored ?? "—" },
                { label: "Runs allowed", value: team.runsAllowed ?? "—" },
                { label: "Players", value: roster.length },
              ].map((figure) => <div key={figure.label}><dt>{figure.label}</dt><dd>{figure.value}</dd></div>)}
            </dl>
          </div>

          <RosterSections key={`${season.id}-${team.id}`} counts={[batters.length, pitchers.length, schedule.length]}>
          <section className="mb-5">
            <SectionHeader title="Batting" meta={batters.length + " players"} />
            {batters.length === 0 ? <EmptyState>No batting stats recorded.</EmptyState> : <RosterStatsTable leagueSlug={league.slug}
rows={batters} kind="batting" avatars={avatars} />}
          </section>
          <section className="mb-5">
            <SectionHeader title="Pitching" meta={pitchers.length + " players"} />
            {pitchers.length === 0 ? <EmptyState>No pitching stats recorded.</EmptyState> : <RosterStatsTable leagueSlug={league.slug}
rows={pitchers} kind="pitching" avatars={avatars} />}
          </section>

          <section>
            <SectionHeader title="Schedule & scores" meta={`${schedule.length} games`} />
            {schedule.length === 0 ? (
              <EmptyState>No games recorded for this team.</EmptyState>
            ) : (
              <ul className="grid gap-1.5 lg:grid-cols-2">
                {schedule.map((game) => {
                  const isHome = game.homeTeamId === team.id;
                  const us = isHome ? game.homeScore : game.awayScore;
                  const them = isHome ? game.awayScore : game.homeScore;
                  const opponent = isHome ? game.awayName : game.homeName;
                  const played = us !== null && them !== null;
                  const won = played && (us as number) > (them as number);
                  const tied = played && us === them;

                  return (
                    <li
                      key={game.id}
                      className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/40 text-sm transition-colors hover:border-slate-600"
                    >
                      <Link href={`/${league.slug}/games/${game.id}`} className={styles.gameLink} aria-label={`${isHome ? "Home" : "Away"} against ${opponent ?? "Unknown"}${played ? `, ${us}–${them}` : ""}; game details`}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        {/* A result is a win or a loss before it is anything
                            else, so it gets the badge and the colour. */}
                        <span
                          className={`w-5 shrink-0 rounded text-center text-xs font-black ${
                            !played
                              ? "text-slate-700"
                              : tied
                                ? "bg-slate-700/60 text-slate-300"
                                : won
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {played ? (tied ? "T" : won ? "W" : "L") : "·"}
                        </span>
                        <span className="w-5 shrink-0 text-xs text-slate-500">{isHome ? "vs" : "@"}</span>
                        {opponent && <TeamLogo teamName={opponent} className="h-5 w-5 shrink-0" />}
                        <span className="truncate">{opponent ?? "Unknown"}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {game.note && <span className="text-xs text-slate-500">{game.note}</span>}
                        <span className="tabular-nums">{played ? `${us}-${them}` : "—"}</span>
                        <span className="text-right text-xs text-slate-400">
                          {game.playedOn?.replace(/^\w+day\s+/, "") ?? ""}
                        </span>
                      </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          </RosterSections>
        </>
      )}
      </div>
    </PageShell>
  );
}
