import type { Metadata } from "next";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { clubOf, getAvatarsFor, getLeagueClubGames, getLeagueSeasonTotals, type SeasonTotalRow } from "@/db/queries";
import { minInningsPitched, minPlateAppearances } from "@/app/scoring";
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
 * "MBL Season V" on the MBL's own page says the league twice, and the season
 * sits under the club in a narrow cell where the room is wanted elsewhere.
 */
function shortSeason(name: string, prefix: string) {
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
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
      // fifteen of them, so the club is named without one.
      teamId: null,
      value: format(row, board),
      season: shortSeason(row.seasonName, prefix),
    }));
}

export default async function RecordsPage({ params }: { params: Promise<{ league: string }> }) {
  const league = await leagueFrom(params);
  const [totals, clubGames] = await Promise.all([
    getLeagueSeasonTotals(league.id),
    getLeagueClubGames(league.id),
  ]);

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

  // Each club's own schedule sets the bar for its players: one and a half
  // plate appearances a game for a batter, an inning a game for a pitcher.
  //
  // It used to be that season's average at-bats, which moved with whoever
  // turned out - a season where half the league played twice dragged it down
  // until four good at-bats could hold a record. A flat number across fifteen
  // seasons would be no better, because the MCBA's early seasons were a third
  // the length of its recent ones. The club's own games are the one figure
  // that means the same thing in every season.
  const qualify = (rows: SeasonTotalRow[], bar: (games: number) => number, key: "plateAppearances" | "inningsPitched") =>
    rows.filter((row) => {
      const games = clubGames.get(row.seasonId)?.get(clubOf(row.teamName));
      // A season with no club record behind it sets no bar rather than
      // shutting everybody in it out.
      return games === undefined || Number(row[key] ?? 0) >= bar(games);
    });

  const qualifiedBatters = qualify(batters, minPlateAppearances, "plateAppearances");
  // Only the four rate boards ask for innings. A save or a complete game is a
  // thing that happened, and no number of innings makes it more true.
  const qualifiedPitchers = qualify(pitchers, minInningsPitched, "inningsPitched");

  const group = (boards: Board[], all: SeasonTotalRow[], qualified: SeasonTotalRow[]) =>
    boards.map((board) => ({
      board,
      rows: build(board, board.qualified ? qualified : all, `${league.abbreviation} `),
    }));

  const sections = [
    {
      title: "Batting records",
      meta: "Rate records need 1.5 plate appearances for every game that player's club played",
      boards: group(BATTING, batters, qualifiedBatters),
    },
    {
      title: "Pitching records",
      meta: "ERA, WHIP and the per-six boards need an inning for every game that player's club played",
      boards: group(perGameLabels(PITCHING, league.inningsPerGame), pitchers, qualifiedPitchers),
    },
    {
      title: "Fielding records",
      meta: "No assists are scored in this league, so these two are the whole of a fielder's record",
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
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
