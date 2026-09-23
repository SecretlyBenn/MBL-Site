import type { Metadata } from "next";
import { BackButton } from "@/app/BackButton";
import { notFound } from "next/navigation";
import { getAvatarsFor, getHistoricalGame, getHistoricalGameSummary } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { formatInnings, hasInningByInning, isForfeit } from "@/app/formatStats";
import { PlayerProfileLink } from "@/app/EntityLinks";
import { PlayerHead } from "@/app/PlayerHead";

export const dynamic = "force-dynamic";

type Stat = Awaited<ReturnType<typeof getHistoricalGame>> extends infer T
  ? T extends { stats: Array<infer S> }
    ? S
    : never
  : never;

/** A player in a box score, with their head, the way every other table shows them. */
function BoxScoreName({ name, uuid }: { name: string; uuid?: string }) {
  return (
    <td className="is-name">
      <span className="flex min-w-0 items-center gap-2">
        <PlayerHead uuid={uuid} name={name} size={18} />
        <PlayerProfileLink name={name} className="truncate" />
      </span>
    </td>
  );
}

function BattingTable({ rows, avatars }: { rows: Stat[]; avatars: Record<string, string> }) {
  return (
    <table className="data-table w-full table-auto">
      <thead>
        <tr>
          <th>Batter</th>
          <th>AB</th>
          <th>R</th>
          <th>H</th>
          <th>2B</th>
          <th>HR</th>
          <th>RBI</th>
          <th>BB</th>
          <th>SO</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <BoxScoreName name={row.playerName} uuid={avatars[row.playerName]} />
            <td>{row.atBats ?? 0}</td>
            <td>{row.runs ?? 0}</td>
            <td>{row.hits ?? 0}</td>
            <td>{row.doubles ?? 0}</td>
            <td>{row.homeRuns ?? 0}</td>
            <td>{row.rbis ?? 0}</td>
            <td>{row.walks ?? 0}</td>
            <td>{row.strikeouts ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PitchingTable({ rows, avatars }: { rows: Stat[]; avatars: Record<string, string> }) {
  return (
    <table className="data-table w-full table-auto">
      <thead>
        <tr>
          <th>Pitcher</th>
          <th>IP</th>
          <th>H</th>
          <th>R</th>
          <th>ER</th>
          <th>BB</th>
          <th>SO</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <BoxScoreName name={row.playerName} uuid={avatars[row.playerName]} />
            <td>
              {formatInnings(row.inningsPitched)}
            </td>
            <td>{row.hitsAllowed ?? 0}</td>
            <td>{row.runsAllowed ?? 0}</td>
            <td>{row.earnedRuns ?? 0}</td>
            <td>{row.walksAllowed ?? 0}</td>
            <td>{row.strikeoutsPitched ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type GameParams = { params: Promise<{ gameId: string }> };

export async function generateMetadata({ params }: GameParams): Promise<Metadata> {
  const gameId = Number((await params).gameId);
  const game = Number.isInteger(gameId) ? await getHistoricalGameSummary(gameId) : null;
  if (!game) return { title: "Game not found", robots: { index: false } };
  const away = game.awayName ?? "Away";
  const home = game.homeName ?? "Home";
  const played = game.awayScore !== null && game.homeScore !== null;
  return {
    title: played ? `${away} ${game.awayScore}–${game.homeScore} ${home}` : `${away} at ${home}`,
    description: `${played ? "Box score and line score" : "Game preview"} for ${away} at ${home}, ${game.seasonName}${
      game.playedOn ? `, ${game.playedOn}` : ""
    }.`,
    alternates: { canonical: `/games/${gameId}` },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const gameId = Number((await params).gameId);
  if (!Number.isInteger(gameId)) notFound();

  const result = await getHistoricalGame(gameId);
  if (!result) notFound();

  const { game, lineScores, stats } = result;
  // Only the players in this game, rather than every profile the league holds:
  // this page has 10ms to render in.
  const avatars = await getAvatarsFor(stats.map((row) => row.playerName));
  const awayWon = (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const homeWon = (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const forfeit = isForfeit({ ...game, hasStats: stats.length > 0 });
  // A fixture the series never reached: on the schedule, but it will never be
  // played, so calling it "scheduled" would say the opposite of what happened.
  const notNeeded = game.status === "NOT_NEEDED" && game.homeScore === null;
  const innings = Math.max(
    ...lineScores.map((row) => (row.innings ?? "").split(",").filter(Boolean).length),
    0,
  );
  // Seasons before XI recorded only the totals, so their per-inning cells are
  // zeros that contradict the score - those games show R/H/E alone below.
  const showInnings = hasInningByInning(game.seasonSortOrder) && innings > 0;
  // Older seasons still show R/H/E; only the per-inning columns drop away.
  const inningCount = showInnings ? innings : 0;

  const side = (isHome: boolean, kind: "BATTING" | "PITCHING") =>
    stats.filter((row) => row.isHome === isHome && row.kind === kind);

  return (
    <PageShell wide header={<span className="sr-only">{`${game.awayName ?? "Away"} @ ${game.homeName ?? "Home"}`}</span>}>
      <div className="mb-4"><BackButton /></div>

      {/* Scoreboard banner: both crests facing each other across the result,
          with the status and date holding the centre. */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/60 to-slate-900">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-6 sm:px-8">
          {/* Away, status, home - in that DOM order, so the grid columns place
              the badge between the two clubs. */}
          {[{ name: game.awayName, score: game.awayScore, won: awayWon, home: false }].map((team) => (
            <div
              key={String(team.home)}
              className={`flex min-w-0 items-center gap-4 ${team.home ? "flex-row-reverse text-right" : ""}`}
            >
              {team.name && <TeamLogo teamName={team.name} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {team.home ? "Home" : "Away"}
                </p>
                <p
                  className={`truncate text-lg font-black uppercase leading-tight sm:text-2xl ${
                    team.won ? "text-white" : "text-slate-400"
                  }`}
                >
                  {team.name ?? (team.home ? "Home" : "Away")}
                </p>
              </div>
              <p
                className={`text-4xl leading-none tabular-nums sm:text-5xl ${
                  team.won ? "font-black text-white" : "font-bold text-slate-600"
                }`}
              >
                {game.awayScore === null && game.homeScore === null ? "–" : team.score ?? "-"}
              </p>
            </div>
          ))}

          <div className="flex flex-col items-center gap-1.5 px-2">
            <span
              className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
                forfeit
                  ? "bg-amber-500/15 text-amber-400"
                  : game.homeScore !== null
                    ? "bg-slate-700/60 text-slate-200"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {forfeit
                ? "Forfeit"
                : game.homeScore !== null
                  ? "Final"
                  : notNeeded
                    ? "Not needed"
                    : "Scheduled"}
            </span>
            <p className="whitespace-nowrap text-xs text-slate-500">{game.playedOn}</p>
            {game.note && (
              <p className="text-[11px] text-slate-600">Ended {game.note}</p>
            )}
          </div>

          {[{ name: game.homeName, score: game.homeScore, won: homeWon, home: true }].map((team) => (
            <div
              key={String(team.home)}
              className="flex min-w-0 flex-row-reverse items-center gap-4 text-right"
            >
              {team.name && <TeamLogo teamName={team.name} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Home</p>
                <p
                  className={`truncate text-lg font-black uppercase leading-tight sm:text-2xl ${
                    team.won ? "text-white" : "text-slate-400"
                  }`}
                >
                  {team.name ?? "Home"}
                </p>
              </div>
              <p
                className={`text-4xl leading-none tabular-nums sm:text-5xl ${
                  team.won ? "font-black text-white" : "font-bold text-slate-600"
                }`}
              >
                {game.awayScore === null && game.homeScore === null ? "–" : team.score ?? "-"}
              </p>
            </div>
          ))}
        </div>

          {/* The innings belong to the scoreboard, not to a second box under
              it: the card says who played, what it finished, and how it got
              there, in one piece. */}
          {lineScores.length > 0 && (
            <div className="overflow-x-auto border-t border-slate-800/80 px-5 py-3 sm:px-8">
              <table className="data-table line-score is-embedded mx-auto table-auto">
                <thead>
                  <tr>
                    <th>Team</th>
                    {Array.from({ length: inningCount }, (_, index) => (
                      <th key={index}>{index + 1}</th>
                    ))}
                    <th className="is-total">R</th>
                    <th className="is-total">H</th>
                    <th className="is-total">E</th>
                  </tr>
                </thead>
                <tbody>
                  {lineScores.map((row) => {
                    const perInning = (row.innings ?? "").split(",").filter(Boolean);
                    return (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap font-semibold">{row.teamLabel}</td>
                        {Array.from({ length: inningCount }, (_, index) => (
                          <td key={index}>{perInning[index] ?? "-"}</td>
                        ))}
                        <td className="is-total">{row.runs ?? "-"}</td>
                        <td className="is-total">{row.hits ?? "-"}</td>
                        <td className="is-total">{row.errors ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {forfeit ? (
        <EmptyState>
          This game was a forfeit. It counts as a 1-0 win for{" "}
          <span className="font-semibold text-slate-300">
            {(awayWon ? game.awayName : game.homeName) ?? "the winning team"}
          </span>
          , and no player statistics were recorded.
        </EmptyState>
      ) : stats.length === 0 ? (
        <EmptyState>No box score recorded for this game.</EmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {[false, true].map((isHome) => {
            const batting = side(isHome, "BATTING");
            const pitching = side(isHome, "PITCHING");
            const name = isHome ? game.homeName : game.awayName;
            if (batting.length === 0 && pitching.length === 0) return null;

            return (
              /* One card per club, its crest, name and final score forming the
                 card header above that club's batting and pitching lines. */
              <section
                key={String(isHome)}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
              >
                <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
                  {name && <TeamLogo teamName={name} className="h-9 w-9 shrink-0" />}
                  <h2 className="min-w-0 flex-1 truncate text-base font-bold">
                    {name ?? (isHome ? "Home" : "Away")}
                  </h2>
                  <span
                    className={`text-2xl leading-none tabular-nums ${
                      (isHome ? homeWon : awayWon) ? "font-black text-white" : "font-bold text-slate-500"
                    }`}
                  >
                    {(isHome ? game.homeScore : game.awayScore) ?? "-"}
                  </span>
                </header>
                {batting.length > 0 && <BattingTable rows={batting} avatars={avatars} />}
                {pitching.length > 0 && (
                  <div className="border-t border-slate-800">
                    <PitchingTable rows={pitching} avatars={avatars} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
