import { earnedRunAverage } from "@/app/scoring";
import { formatInnings } from "@/app/formatStats";

/**
 * The handful of figures a player is actually known by, for the top of their
 * page.
 *
 * A career page used to open with a name and then a table per season, which
 * left the reader to add up eight rows in their head to answer the only
 * question they came with. These are worked out from the seasons the page has
 * already loaded, so they cost nothing.
 *
 * Rates are recomputed from the totals rather than averaged across seasons: a
 * season of four at-bats would otherwise count as much as a season of ninety.
 */

type SeasonRow = {
  games?: number | null;
  atBats?: number | null;
  hits?: number | null;
  homeRuns?: number | null;
  rbis?: number | null;
  walks?: number | null;
  totalBases?: number | null;
  inningsPitched?: number | null;
  earnedRuns?: number | null;
  strikeoutsPitched?: number | null;
  wins?: number | null;
  losses?: number | null;
  saves?: number | null;
};

export type CareerTotals = ReturnType<typeof careerTotals>;

export function careerTotals(seasons: SeasonRow[]) {
  const sum = (pick: (row: SeasonRow) => number | null | undefined) =>
    seasons.reduce((total, row) => total + Number(pick(row) ?? 0), 0);

  const atBats = sum((row) => row.atBats);
  const hits = sum((row) => row.hits);
  const walks = sum((row) => row.walks);
  const totalBases = sum((row) => row.totalBases);
  const innings = sum((row) => row.inningsPitched);

  return {
    games: sum((row) => row.games),
    atBats,
    hits,
    homeRuns: sum((row) => row.homeRuns),
    rbis: sum((row) => row.rbis),
    average: atBats ? hits / atBats : null,
    onBase: atBats + walks ? (hits + walks) / (atBats + walks) : null,
    slugging: atBats ? totalBases / atBats : null,
    innings,
    wins: sum((row) => row.wins),
    losses: sum((row) => row.losses),
    saves: sum((row) => row.saves),
    strikeouts: sum((row) => row.strikeoutsPitched),
    era: innings ? earnedRunAverage(sum((row) => row.earnedRuns), innings) : null,
  };
}

/** A rate in baseball's own notation: .312, not 0.312. */
const rate = (value: number | null, places = 3) =>
  value === null ? "—" : value.toFixed(places).replace(/^0/, "");

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[3.5rem]">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="text-xl font-black tabular-nums text-slate-100">{value}</p>
    </div>
  );
}

export function CareerLine({ totals }: { totals: CareerTotals }) {
  const batted = totals.atBats > 0;
  const pitched = totals.innings > 0;
  if (!batted && !pitched) return null;

  return (
    <div className="mt-4 flex w-full flex-wrap items-end gap-x-7 gap-y-3 border-t border-slate-800/80 pt-4">
      {batted && (
        <>
          <Figure label="Games" value={totals.games} />
          <Figure label="AVG" value={rate(totals.average)} />
          <Figure label="OPS" value={rate((totals.onBase ?? 0) + (totals.slugging ?? 0))} />
          <Figure label="HR" value={totals.homeRuns} />
          <Figure label="RBI" value={totals.rbis} />
          <Figure label="Hits" value={totals.hits} />
        </>
      )}
      {/* A player who both bats and pitches gets both lines, divided. */}
      {batted && pitched && <span className="h-9 w-px self-center bg-slate-800" aria-hidden />}
      {pitched && (
        <>
          <Figure label="W-L" value={`${totals.wins}-${totals.losses}`} />
          <Figure label="ERA" value={rate(totals.era, 2)} />
          <Figure label="IP" value={formatInnings(totals.innings)} />
          <Figure label="SO" value={totals.strikeouts} />
          {totals.saves > 0 && <Figure label="SV" value={totals.saves} />}
        </>
      )}
    </div>
  );
}
