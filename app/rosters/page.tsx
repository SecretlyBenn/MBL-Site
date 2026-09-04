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
import { HistoricalTeamLink, PlayerProfileLink } from "@/app/EntityLinks";
import { RosterSelect } from "./RosterSelect";

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
 * The column is capped rather than given a share of the table. A roster line
 * is mostly figures, and handing 42% of the width to the one text column left
 * the handful of numbers strung out across the rest of the page.
 */
function NameCell({ name, uuid }: { name: string; uuid?: string }) {
  return (
    <td className="is-name">
      <span className="flex min-w-0 items-center gap-2">
        <PlayerHead uuid={uuid} name={name} size={18} />
        <PlayerProfileLink name={name} className="truncate" />
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
      <div className="mb-6 flex flex-wrap items-center gap-4">
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
          <div className="mb-8 flex items-center gap-4">
            <TeamLogo teamName={team.name} className="h-16 w-16" />
            <div>
              <h2 className="text-xl font-bold">
                <HistoricalTeamLink name={team.name} seasonId={season.id} teamId={team.id} />
              </h2>
              <p className="text-sm text-slate-400">
                {wins}-{losses}
                {team.league ? ` · ${team.league === "AMERICAN" ? "American" : "National"} League` : ""}
                {` · ${roster.length} players`}
              </p>
            </div>
          </div>

          <section className="mb-10">
            <SectionHeader title="Batting" meta={`${batters.length} players`} />
            {batters.length === 0 ? (
              <EmptyState>No batting stats recorded.</EmptyState>
            ) : (
              // Sized to its contents rather than stretched to the page, and
              // allowed to scroll sideways on a narrow one. A full batting line
              // is eighteen columns; it was the six-column version forced to
              // the container width that left so much air between the figures.
              <div className="data-table-shell overflow-x-auto">
                <table className="data-table w-full">
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
                      <tr key={row.playerName}>
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
              <div className="data-table-shell overflow-x-auto">
                <table className="data-table w-full">
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
            <SectionHeader title="Schedule &amp; scores" meta={`${schedule.length} games`} />
            {schedule.length === 0 ? (
              <EmptyState>No games recorded for this team.</EmptyState>
            ) : (
              <ul className="space-y-1.5">
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
                      className="flex items-center justify-between gap-3 rounded border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {played && (
                          <span
                            className={
                              tied ? "text-slate-500" : won ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {tied ? "T" : won ? "W" : "L"}
                          </span>
                        )}
                        <span className="text-slate-500">{isHome ? "vs" : "@"}</span>
                        <span className="truncate">{opponent ?? "Unknown"}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {game.note && <span className="text-xs text-slate-500">{game.note}</span>}
                        <span className="tabular-nums">{played ? `${us}-${them}` : "—"}</span>
                        <span className="w-28 text-right text-xs text-slate-500">
                          {game.playedOn?.replace(/^\w+day\s+/, "") ?? ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
