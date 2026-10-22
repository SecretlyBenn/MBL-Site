import type { Metadata } from "next";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { getAvatarsFor, getLeagueSeasonTotals, type SeasonTotalRow } from "@/db/queries";
import { BATTING, FIELDING, PITCHING, format, perGameLabels, type Board } from "../boards";
import { LeaderBoard, type LeaderRow } from "../leaders/LeaderBoard";
import { leagueFrom } from "../../league";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Single-Season Records",
    description: "The best seasons anybody has ever had, in batting, pitching and fielding.",
    alternates: { canonical: `/${league}/statistics/records` },
  };
}

export const dynamic = "force-dynamic";

/** How many of each board are kept. Enough to find yourself, short enough to send. */
const DEEP = 25;

/**
 * The best single seasons in the competition's history.
 *
 * The leaders page answers "who led this season". This asks the longer
 * question - who has ever had a season like that - so a board here is one row
 * per player-season rather than one per player, and the same man can hold
 * more than one place on it. The season is named beside every line, because a
 * record with no year on it is half a fact.
 *
 * Records are single-season, not career. A career total is a different list
 * and belongs on its own page; mixing them would put a fourteen-season hit
 * total above every real season anybody played.
 */
/**
 * "MBL Season XI Playoffs" under a column headed SEASON, on the MBL's own
 * page, says both of those words again and then runs out of room for the
 * part that tells them apart. What is left is "XI Playoffs".
 */
function shortSeason(name: string, prefix: string) {
  const withoutLeague = name.startsWith(prefix) ? name.slice(prefix.length) : name;
  return withoutLeague.startsWith("Season ") ? withoutLeague.slice("Season ".length) : withoutLeague;
}

function build(board: Board, rows: SeasonTotalRow[], prefix: string): LeaderRow[] {
  return rows
    .filter((row) => {
      const raw = row[board.key];
      return raw !== null && raw !== undefined && (board.ascending || Number(raw) > 0);
    })
    .sort((a, b) => {
      const difference = Number(a[board.key] ?? 0) - Number(b[board.key] ?? 0);
      return board.ascending ? difference : -difference;
    })
    .slice(0, DEEP)
    .map((row) => ({
      playerName: row.playerName,
      // A season line already names the club he finished it with.
      teamName: row.teamName.replace(/ \(\+\d+\)$/, ""),
      // The club link wants a season's own standings and these rows span
      // fifteen of them, so the crest is shown without one.
      teamId: null,
      value: format(row, board),
      season: shortSeason(row.seasonName, prefix),
    }));
}

export default async function RecordsPage({ params }: { params: Promise<{ league: string }> }) {
  const league = await leagueFrom(params);
  const totals = await getLeagueSeasonTotals(league.id);

  if (totals.length === 0) {
    return (
      <PageShell title="Records">
        <EmptyState>This competition has no finished seasons yet.</EmptyState>
      </PageShell>
    );
  }

  const batters = totals.filter((row) => (row.atBats ?? 0) > 0);
  const pitchers = totals.filter((row) => (row.inningsPitched ?? 0) > 0);
  const fielders = totals.filter((row) => ((row.putouts ?? 0) + (row.errors ?? 0)) > 0);

  // Each season sets its own bar, the way its own leaderboard does. A single
  // threshold across fifteen seasons would be the wrong one for most of them:
  // the MCBA's early seasons were far shorter than its recent ones, so a flat
  // minimum would either admit a four-at-bat .750 or shut out a whole era.
  const qualify = (rows: SeasonTotalRow[], key: "atBats" | "inningsPitched") => {
    const totalBySeason = new Map<number, { sum: number; count: number }>();
    for (const row of rows) {
      const seen = totalBySeason.get(row.seasonId) ?? { sum: 0, count: 0 };
      seen.sum += Number(row[key] ?? 0);
      seen.count += 1;
      totalBySeason.set(row.seasonId, seen);
    }
    return rows.filter((row) => {
      const seen = totalBySeason.get(row.seasonId);
      return seen ? Number(row[key] ?? 0) >= seen.sum / Math.max(1, seen.count) : false;
    });
  };

  const qualifiedBatters = qualify(batters, "atBats");
  const qualifiedPitchers = qualify(pitchers, "inningsPitched");

  const group = (boards: Board[], all: SeasonTotalRow[], qualified: SeasonTotalRow[]) =>
    boards.map((board) => ({
      board,
      rows: build(board, board.qualified ? qualified : all, `${league.abbreviation} `),
    }));

  const sections = [
    {
      title: "Batting records",
      meta: "Rate records need a qualifying season, judged against that season's own average",
      boards: group(BATTING, batters, qualifiedBatters),
    },
    {
      title: "Pitching records",
      meta: "Rate records need a qualifying season, judged against that season's own average",
      boards: group(perGameLabels(PITCHING, league.inningsPerGame), pitchers, qualifiedPitchers),
    },
    {
      title: "Fielding records",
      meta: "The league scores no assists, so chances are putouts plus errors",
      boards: group(FIELDING, fielders, fielders),
    },
  ];

  // Only the heads these boards will actually draw. Every season of the
  // archive is in memory here, and looking up a thousand names to show a
  // couple of hundred would cost more than the page. The boards are already
  // built, so the head is hung on the row rather than sorting it all again.
  const shown = new Set<string>();
  for (const section of sections) {
    for (const { rows } of section.boards) for (const row of rows) shown.add(row.playerName);
  }
  const avatars = await getAvatarsFor([...shown]);
  for (const section of sections) {
    for (const { rows } of section.boards) {
      for (const row of rows) row.uuid = avatars[row.playerName];
    }
  }

  return (
    <PageShell
      wide
      title="Records"
      subtitle={`The best single seasons in ${league.abbreviation} history`}
    >
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <SectionHeader title={section.title} meta={section.meta} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {section.boards.map(({ board, rows }) => (
                <LeaderBoard
                  key={String(board.key)}
                  leagueSlug={league.slug}
                  label={board.label}
                  unit={board.unit}
                  rows={rows}
                  seasonId={0}
                  columnLabel="Season"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
