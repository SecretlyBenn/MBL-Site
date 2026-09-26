import Link from "next/link";
import { TeamLogo } from "@/app/TeamLogo";
import {
  buildBracket,
  splitsByLeague,
  stageLabel,
  type BracketGame,
  type BracketTeam,
  type Round,
  type Series,
} from "./build-bracket";

const LEAGUES = ["AMERICAN", "NATIONAL"] as const;
const LEAGUE_NAMES: Record<(typeof LEAGUES)[number], string> = {
  AMERICAN: "American League",
  NATIONAL: "National League",
};

/**
 * A playoff season, drawn as the bracket it is.
 *
 * Standings mean little in a postseason: a club that went 3-2 and won its
 * series is ahead of one that went 4-3 and lost. What people want is who is
 * still alive and who they play next, so a playoff season shows this instead.
 */

/** "Knights" from "Cincinnati Knights": the name a series is talked about by. */
const nickname = (name: string) => name.split(" ").slice(-1)[0] ?? name;

/** "September 4, 2026" from the archive's "Friday September 4, 2026". */
const withoutWeekday = (value: string | null) => value?.replace(/^\w+day\s+/, "") ?? "";

function status(series: Series, nameOf: (id: number) => string) {
  const top = series.wins[series.top];
  const bottom = series.wins[series.bottom];
  const high = Math.max(top, bottom);
  const low = Math.min(top, bottom);
  if (series.winnerId !== null) return `${nickname(nameOf(series.winnerId))} win ${high}-${low}`;
  if (series.results.length === 0) {
    return series.firstDate ? `Starts ${withoutWeekday(series.firstDate)}` : "Not started";
  }
  if (top === bottom) return `Tied ${top}-${bottom}`;
  return `${nickname(nameOf(top > bottom ? series.top : series.bottom))} lead ${high}-${low}`;
}

function SeriesCard({ series, nameOf, leagueSlug }: { series: Series | null; nameOf: (id: number) => string; leagueSlug: string }) {
  if (!series) {
    return (
      <div className="flex h-[7.25rem] items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600">
        To be decided
      </div>
    );
  }

  const decided = series.winnerId !== null;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      {[series.top, series.bottom].map((teamId) => {
        const won = series.winnerId === teamId;
        // Once a series is over the club that went out steps back, so the
        // eye follows the one still playing across the bracket.
        const out = decided && !won;
        return (
          <div
            key={teamId}
            className={`flex items-center gap-2.5 px-3 py-2 ${teamId === series.top ? "border-b border-slate-800/80" : ""} ${
              out ? "opacity-45" : ""
            }`}
          >
            <TeamLogo teamName={nameOf(teamId)} className="h-6 w-6 shrink-0" />
            <span className={`min-w-0 flex-1 truncate text-sm ${won ? "font-bold text-white" : "text-slate-200"}`}>
              {nameOf(teamId)}
            </span>
            <span className={`text-lg tabular-nums ${won ? "font-black text-sky-300" : "font-bold text-slate-400"}`}>
              {series.wins[teamId]}
            </span>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-slate-950/40 px-3 py-1.5 text-[11px]">
        <span className={decided ? "font-semibold text-slate-300" : "text-slate-400"}>
          {status(series, nameOf)}
        </span>
        {/* Each game, from the top club's side, opening its box score. */}
        <span className="ml-auto flex gap-1.5">
          {series.results.map((result) => (
            <Link
              key={result.id}
              href={`/${leagueSlug}/games/${result.id}`}
              className={`rounded px-1 tabular-nums transition-colors hover:bg-slate-800 hover:text-white ${
                result.winnerId === series.top ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {result.score}
            </Link>
          ))}
        </span>
      </div>
    </div>
  );
}

export function Bracket({
  games,
  teams,
  leagueSlug,
  compact = false,
}: {
  games: BracketGame[];
  teams: BracketTeam[];
  leagueSlug: string;
  /** Rounds stacked down the page instead of across it, for a narrow column. */
  compact?: boolean;
}) {
  const rounds = buildBracket(games, teams);
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const nameOf = (id: number) => names.get(id) ?? "Unknown";

  if (rounds.length === 0) {
    return <p className="text-sm text-slate-500">No playoff games have been scheduled yet.</p>;
  }

  const finalRound = rounds[rounds.length - 1];
  const final = finalRound.series;
  const championId = final.length === 1 ? (final[0]?.winnerId ?? null) : null;
  const split = splitsByLeague(rounds);
  const earlyRounds = rounds.slice(0, -1);

  /** One round's series for one league, each with its place in the round. */
  const slotsOf = (round: Round, league: string) =>
    round.series.flatMap((series, index) => (round.leagues[index] === league ? [{ series, index }] : []));

  const cards = (slots: { series: Series | null; index: number }[]) =>
    slots.map(({ series, index }) => (
      <SeriesCard key={series?.key ?? `open-${index}`} series={series} nameOf={nameOf} leagueSlug={leagueSlug} />
    ));

  const heading = (text: string, small = false) => (
    <p
      className={`mb-2 font-bold uppercase tracking-wider ${
        small ? "text-[11px] text-slate-500" : "text-xs text-slate-400"
      }`}
    >
      {text}
    </p>
  );

  return (
    <div className="flex flex-col gap-4">
      {championId !== null && (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/40 px-4 py-3">
          <TeamLogo teamName={nameOf(championId)} className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Champions</p>
            <p className="text-xl font-black tracking-tight text-white">{nameOf(championId)}</p>
          </div>
        </div>
      )}

      {compact ? (
        // Down the page, a stage at a time: ALDS, NLDS, ALCS, NLCS, WS.
        <div className="flex flex-col gap-4">
          {split
            ? earlyRounds.flatMap((round) =>
                LEAGUES.map((league) => (
                  <div key={`${round.number}-${league}`}>
                    {heading(stageLabel(round.stage, league), true)}
                    <div className="grid gap-3 sm:grid-cols-2">{cards(slotsOf(round, league))}</div>
                  </div>
                )),
              )
            : earlyRounds.map((round) => (
                <div key={round.number}>
                  {heading(round.label, true)}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {cards(round.series.map((series, index) => ({ series, index })))}
                  </div>
                </div>
              ))}
          <div>
            {heading(stageLabel(finalRound.stage, null), true)}
            <div className="grid gap-3 sm:grid-cols-2">
              {cards(final.map((series, index) => ({ series, index })))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-stretch gap-6">
            {split ? (
              // The American League's side above the National League's, each
              // reading left to right into the World Series between them.
              <div className="flex flex-col gap-8">
                {LEAGUES.map((league) => (
                  <section key={league} aria-label={LEAGUE_NAMES[league]}>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {LEAGUE_NAMES[league]}
                    </p>
                    <div className="flex gap-6">
                      {earlyRounds.map((round) => (
                        <div key={round.number} className="flex w-72 flex-col">
                          {heading(stageLabel(round.stage, league))}
                          <div className="flex flex-1 flex-col justify-around gap-4">{cards(slotsOf(round, league))}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              // Each round is a column, and its series are spread down the
              // column so a series sits level with the two that fed it.
              earlyRounds.map((round) => (
                <div key={round.number} className="flex w-72 flex-col">
                  {heading(round.label)}
                  <div className="flex flex-1 flex-col justify-around gap-4">
                    {cards(round.series.map((series, index) => ({ series, index })))}
                  </div>
                </div>
              ))
            )}
            <div className="flex w-72 flex-col justify-center">
              {heading(stageLabel(finalRound.stage, null))}
              <div className="flex flex-col gap-4">{cards(final.map((series, index) => ({ series, index })))}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
