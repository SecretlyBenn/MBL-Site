import {
  getHistoricalSchedule,
  getHistoricalSeasonStandings,
  getHistoricalSeasons,
  getHistoricalTeamRoster,
} from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { formatInnings } from "@/app/formatStats";
import { HistoricalTeamLink, PlayerProfileLink } from "@/app/EntityLinks";
import { RosterSelect } from "./RosterSelect";

export const dynamic = "force-dynamic";

function rate(value: number | null) {
  return value === null ? "-" : value.toFixed(3).replace(/^0/, "");
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
              <h2 className="text-xl font-bold"><HistoricalTeamLink name={team.name} seasonId={season.id} teamId={team.id} /></h2>
              <p className="text-sm text-slate-400">
                {wins}-{losses}
                {team.league ? ` · ${team.league === "AMERICAN" ? "American" : "National"} League` : ""}
                {` · ${roster.length} players`}
              </p>
            </div>
          </div>

          <section className="mb-10">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Batting ({batters.length})
            </h3>
            {batters.length === 0 ? (
              <EmptyState>No batting stats recorded.</EmptyState>
            ) : (
              <div className="data-table-shell">
                <table className="data-table w-full table-fixed">
                  <colgroup><col style={{ width: "42%" }} />{Array.from({ length: 7 }, (_, index) => <col key={index} />)}</colgroup>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>G</th>
                      <th>AB</th>
                      <th>H</th>
                      <th>HR</th>
                      <th>RBI</th>
                      <th>AVG</th>
                      <th>OPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batters.map((row) => (
                      <tr key={row.playerName}>
                        <td><PlayerProfileLink name={row.playerName} /></td>
                        <td>{row.games ?? 0}</td>
                        <td>{row.atBats ?? 0}</td>
                        <td>{row.hits ?? 0}</td>
                        <td>{row.homeRuns ?? 0}</td>
                        <td>{row.rbis ?? 0}</td>
                        <td>
                          {rate(row.battingAverage ?? 0)}
                        </td>
                        <td>
                          {rate(row.ops ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-10">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Pitching ({pitchers.length})
            </h3>
            {pitchers.length === 0 ? (
              <EmptyState>No pitching stats recorded.</EmptyState>
            ) : (
              <div className="data-table-shell">
                <table className="data-table w-full table-fixed">
                  <colgroup><col style={{ width: "55%" }} />{Array.from({ length: 4 }, (_, index) => <col key={index} />)}</colgroup>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>IP</th>
                      <th>SO</th>
                      <th>ERA</th>
                      <th>WHIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pitchers.map((row) => (
                      <tr key={row.playerName}>
                        <td><PlayerProfileLink name={row.playerName} /></td>
                        <td>
                          {formatInnings(row.inningsPitched)}
                        </td>
                        <td>
                          {row.strikeoutsPitched ?? "-"}
                        </td>
                        <td>
                          {row.era === null ? "-" : row.era.toFixed(2)}
                        </td>
                        <td>
                          {row.whip === null ? "-" : row.whip.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Schedule &amp; scores ({schedule.length})
            </h3>
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
                              tied ? "text-slate-500" : won ? "text-green-400" : "text-red-400"
                            }
                          >
                            {tied ? "T" : won ? "W" : "L"}
                          </span>
                        )}
                        <span className="text-slate-500">{isHome ? "vs" : "@"}</span>
                        <span className="truncate">{opponent ?? "Unknown"}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {game.note && (
                          <span className="text-xs text-slate-500">{game.note}</span>
                        )}
                        <span className="tabular-nums">
                          {played ? `${us}-${them}` : "—"}
                        </span>
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
