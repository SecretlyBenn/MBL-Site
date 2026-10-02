import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAccountNames, getLeagues, getPlayerGameLog, getPlayerHistoricalStats, getPlayerRosterIdentity, getPrimaryPositions, getProfilesFor } from "@/db/queries";
import { PageShell } from "@/app/SiteNav";
import { BackButton } from "@/app/BackButton";
import { PlayerHead } from "@/app/PlayerHead";
import { PlayerLeagues, type LeagueRecord } from "@/app/[league]/players/PlayerLeagues";
import { TeamLogo } from "@/app/TeamLogo";
import { CareerLine, careerTotals } from "@/app/[league]/players/CareerLine";
import { ERA_INNINGS } from "@/app/scoring";
import { leagueFrom } from "../../../league";

export const dynamic = "force-dynamic";

// The name is the whole subject, and it is already in the address - no lookup.
export async function generateMetadata({ params }: { params: Promise<{ league: string; playerName: string }> }): Promise<Metadata> {
  const { league, playerName } = await params;
  const name = decodeURIComponent(playerName);
  return {
    title: name,
    description: `${name}'s career in the Minecraft Baseball League: season-by-season batting and pitching, and a game-by-game log.`,
    alternates: { canonical: `/${league}/players/history/${encodeURIComponent(name)}` },
  };
}

export default async function HistoricalPlayerPage({
  params,
}: {
  params: Promise<{ league: string; playerName: string }>;
}) {
  const { playerName } = await params;
  const name = decodeURIComponent(playerName);

  // Each competition files a player under the name they used there, so one
  // person's MCBA record and their MBL record sit under different names. The
  // Minecraft account is what ties them together, so both are fetched at once
  // and split by league below - two queries for the pair rather than two each.
  const names = await getAccountNames(name);

  const [allHistory, allGames, profiles, allLeagues] = await Promise.all([
    getPlayerHistoricalStats(names),
    getPlayerGameLog(names),
    // One head is drawn on this page - his. Reading all 600-odd profiles for
    // it was the single most wasteful query on the site.
    getProfilesFor([name]),
    getLeagues(),
  ]);
  if (allHistory.length === 0) notFound();

  // One record per competition, in the leagues' own order, so a player who
  // came up through the MCBA opens on the MBL - the senior competition is the
  // one people mean. The two are never added together: they are two careers.
  const records: LeagueRecord[] = allLeagues
    .map((competition) => {
      const seasons = allHistory.filter((row) => row.leagueSlug === competition.slug);
      return {
        slug: competition.slug,
        name: competition.name,
        inningsPerGame: competition.inningsPerGame,
        playerName: seasons[0]?.playerName ?? name,
        seasonCount: new Set(seasons.map((row) => row.seasonId)).size,
        seasons: seasons as never[],
        games: allGames.filter((row) => row.leagueSlug === competition.slug) as never[],
        playedPitching: seasons.some((row) => (row.inningsPitched ?? 0) > 0),
      };
    })
    .filter((record) => record.seasons.length > 0);

  // The header describes the record the page opens on, so the career line and
  // the club above always belong to the tab showing underneath it.
  const history = records[0]?.seasons.length ? (records[0].seasons as typeof allHistory) : allHistory;

  // The page is about a person, so it leads with the name they go by now,
  // which the head route keeps up to date on its own. The archive filed them
  // under whatever they were called at the time, and that name still leads
  // every table below - it is what the box scores say - so it is shown here
  // too rather than quietly replaced.
  const account = profiles[name];
  const known = account?.currentName || name;
  const renamedSince = known !== name;

  const seasonCount = new Set(history.map((row) => row.seasonId)).size;
  // The team they most recently appeared for leads the header.
  const latest = [...history].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))[0];

  // The number comes from the archive, which recorded one for almost nobody.
  // The position is the one they have played most in scored games, so it fills
  // in on its own as umpires work through the season; until then it is a dash
  // rather than a guess.
  const [roster, positions] = await Promise.all([
    getPlayerRosterIdentity(name),
    getPrimaryPositions(),
  ]);
  const jersey = roster?.jerseyNumber ? `#${roster.jerseyNumber}` : null;
  const position = positions[name] ?? roster?.positions ?? "—";

  return (
    <PageShell
      wide
      header={
        <div className="relative -mx-6 -mt-5 mb-6 overflow-hidden border-b border-slate-800/80 bg-slate-900/40 px-6 py-6">
          {/* The club's crest, large and nearly invisible, so the header
              belongs to a team without competing with the player's own head. */}
          {latest?.teamName && (
            <TeamLogo
              teamName={latest.teamName}
              className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 opacity-[0.06]"
            />
          )}
          <div className="relative flex flex-wrap items-center gap-5">
            <PlayerHead uuid={account?.uuid} name={known} size={96} className="rounded-lg" />
            <div className="min-w-0">
              {/* A dash on its own said nothing; the line appears once there
                  is a number or a position to put in it. */}
              {(jersey || position !== "—") && (
                <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.15em] text-sky-400">
                  {[jersey, position === "—" ? null : position].filter(Boolean).join(" · ")}
                </p>
              )}
              <h1 className="text-4xl font-black tracking-tight">{known}</h1>
              {renamedSince && (
                <p className="mt-0.5 text-sm text-slate-400">
                  played as <span className="font-semibold text-slate-300">{name}</span>
                </p>
              )}
              {latest?.teamName && (
                <span className="mt-1.5 flex items-center gap-2 text-sm text-slate-300">
                  <TeamLogo teamName={latest.teamName} className="h-5 w-5" />
                  {latest.teamName}
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-4 self-start">
              <span className="text-sm text-slate-500">
                {seasonCount} season{seasonCount === 1 ? "" : "s"}
              </span>
              <BackButton />
            </div>

            {/* What this player did across every season, worked out from the
                seasons already on the page. It answers the question the page
                is opened with - how good are they - before anyone reads a
                table. */}
            <CareerLine totals={careerTotals(history, records[0]?.inningsPerGame ?? ERA_INNINGS)} />
          </div>
        </div>
      }
    >
      <PlayerLeagues records={records} />
    </PageShell>
  );
}
