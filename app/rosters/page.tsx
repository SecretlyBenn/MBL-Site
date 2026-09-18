import Link from "next/link";
import { BackButton } from "@/app/BackButton";
import { RosterSections } from "./RosterSections";
import styles from "./rosters.module.css";
import type { Metadata } from "next";
import {
  getHistoricalSchedule,
  getHistoricalSeasonStandings,
  getHistoricalSeasons,
  getHistoricalTeamRoster,
  getPlayerAvatars,
} from "@/db/queries";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { PlayerHead } from "@/app/PlayerHead";
import { TeamLogo } from "@/app/TeamLogo";
import { formatInnings } from "@/app/formatStats";
import { PlayerProfileLink } from "@/app/EntityLinks";
import { RosterSelect } from "./RosterSelect";

export const metadata: Metadata = {
  title: "Rosters",
  description:
    "Minecraft Baseball League team rosters by season: every player, their positions and their season statistics.",
  alternates: { canonical: "/rosters" },
};

export const dynamic = "force-dynamic";

function rate(value: number | null) {
  return value === null ? "-" : value.toFixed(3).replace(/^0/, "");
}

/** A counting stat. A player who did none of something has none, not a blank. */
function count(value: number | null) {
  return value ?? 0;
}

/**
 * A player's name at the head of a stat line.
 *
 * The name is the only text in a line of figures, so it takes whatever the
 * longest name needs and no more. It used to be given a fixed 42% of the
 * table, which on a wide screen was most of the row.
 */
function NameCell({ name, uuid }: { name: string; uuid?: string }) {
  return (
    <td className="is-name">
      <span className={styles.player}>
        <PlayerHead uuid={uuid} name={name} size={26} />
        <PlayerProfileLink name={name} />
      </span>
    </td>
  );
}

export default async function RostersPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; team?: string }>;
}) {
  const { season: seasonParam, team: teamParam } = await searchParams;
  const seasons = await getHistoricalSeasons();
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
  const avatars = await getPlayerAvatars();

  const wins = team?.wins ?? 0;
  const losses = team?.losses ?? 0;
  // A listed roster member may not have appeared in a game. Keep those
  // players in the main roster table and show a complete zero stat line.
  const batters = roster.filter((row) => (row.atBats ?? 0) > 0 || !row.played);
  const pitchers = roster.filter((row) => (row.inningsPitched ?? 0) > 0);

  return (
    <PageShell wide title="Rosters" subtitle={season.name}>
      <div className="mb-4"><BackButton /></div>
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
          <section className="mb-10">
            <SectionHeader title="Batting" meta={`${batters.length} players`} />
            {batters.length === 0 ? (
              <EmptyState>No batting stats recorded.</EmptyState>
            ) : (
              // Keep full player names visible while the stats scroll inside
              // their own container on smaller screens.
              <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Player statistics; scroll for more columns">
                <table className="data-table w-auto">
                  <thead>
                    <tr>
                      <th className="is-name">Player</th>
                      <th>G</th>
                      <th>AB</th>
                      <th>R</th>
                      <th>H</th>
                      <th>2B</th>
                      <th>3B</th>
                      <th>HR</th>
                      <th>RBI</th>
                      <th>BB</th>
                      <th>SO</th>
                      <th>SB</th>
                      <th>PO</th>
                      <th>E</th>
                      <th>AVG</th>
                      <th>OBP</th>
                      <th>SLG</th>
                      <th>OPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batters.map((row) => (
                      // Someone listed on the roster who never appeared has a
                      // line of zeros, which reads as a bad season rather than
                      // no season. Dimming the row says which it is.
                      <tr key={row.playerName} className={row.played ? "" : "text-slate-500"}>
                        <NameCell name={row.playerName} uuid={avatars[row.playerName]} />
                        <td>{count(row.games)}</td>
                        <td>{count(row.atBats)}</td>
                        <td>{count(row.runs)}</td>
                        <td>{count(row.hits)}</td>
                        <td>{count(row.doubles)}</td>
                        <td>{count(row.triples)}</td>
                        <td>{count(row.homeRuns)}</td>
                        <td>{count(row.rbis)}</td>
                        <td>{count(row.walks)}</td>
                        <td>{count(row.strikeouts)}</td>
                        <td>{count(row.stolenBases)}</td>
                        <td>{count(row.putouts)}</td>
                        <td>{count(row.errors)}</td>
                        <td>{rate(row.battingAverage ?? 0)}</td>
                        <td>{rate(row.onBasePct ?? 0)}</td>
                        <td>{rate(row.sluggingPct ?? 0)}</td>
                        <td>{rate(row.ops ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-10">
            <SectionHeader title="Pitching" meta={`${pitchers.length} players`} />
            {pitchers.length === 0 ? (
              <EmptyState>No pitching stats recorded.</EmptyState>
            ) : (
              <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Player statistics; scroll for more columns">
                <table className="data-table w-auto">
                  <thead>
                    <tr>
                      <th className="is-name">Player</th>
                      <th>G</th>
                      <th>GS</th>
                      <th>W</th>
                      <th>L</th>
                      <th>SV</th>
                      <th>CG</th>
                      <th>SHO</th>
                      <th>IP</th>
                      <th>H</th>
                      <th>R</th>
                      <th>ER</th>
                      <th>HR</th>
                      <th>BB</th>
                      <th>SO</th>
                      <th>ERA</th>
                      <th>WHIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pitchers.map((row) => (
                      <tr key={row.playerName}>
                        <NameCell name={row.playerName} uuid={avatars[row.playerName]} />
                        <td>{count(row.pitchingGames)}</td>
                        <td>{count(row.gamesStarted)}</td>
                        <td>{count(row.wins)}</td>
                        <td>{count(row.losses)}</td>
                        <td>{count(row.saves)}</td>
                        <td>{count(row.completeGames)}</td>
                        <td>{count(row.shutouts)}</td>
                        <td>{formatInnings(row.inningsPitched)}</td>
                        <td>{count(row.hitsAllowed)}</td>
                        <td>{count(row.runsAllowed)}</td>
                        <td>{count(row.earnedRuns)}</td>
                        <td>{count(row.homeRunsAllowed)}</td>
                        <td>{count(row.walksAllowed)}</td>
                        <td>{count(row.strikeoutsPitched)}</td>
                        <td>{row.era === null ? "-" : row.era.toFixed(2)}</td>
                        <td>{row.whip === null ? "-" : row.whip.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                      <Link href={`/games/${game.id}`} className={styles.gameLink} aria-label={`${isHome ? "Home" : "Away"} against ${opponent ?? "Unknown"}${played ? `, ${us}–${them}` : ""}; game details`}>
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
    </PageShell>
  );
}
