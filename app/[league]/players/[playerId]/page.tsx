import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { players, teams } from "@/db/schema";
import { getPlayerHistoricalStats, getPlayerLiveStats } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { BackButton } from "@/app/BackButton";
import { PlayerHistory } from "@/app/[league]/players/PlayerHistory";
import { formatInnings } from "@/app/formatStats";
import { leagueFrom } from "../../league";

export const dynamic = "force-dynamic";

function rate(value: number) { return value.toFixed(3).replace(/^0/, ""); }

export async function generateMetadata({ params }: { params: Promise<{ league: string; playerId: string }> }): Promise<Metadata> {
  const { league, playerId: value } = await params;
  const playerId = Number(value);
  const player = Number.isInteger(playerId)
    ? await getDb().query.players.findFirst({ where: eq(players.id, playerId), columns: { displayName: true } })
    : null;
  if (!player) return { title: "Player not found", robots: { index: false } };
  return {
    title: player.displayName,
    description: `${player.displayName}'s statistics in the Minecraft Baseball League.`,
    alternates: { canonical: `/${league}/players/${playerId}` },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ league: string; playerId: string }> }) {
  const league = await leagueFrom(params);
  const { playerId: value } = await params;
  const playerId = Number(value);
  if (!Number.isInteger(playerId)) notFound();
  const db = getDb();
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) notFound();
  const team = player.teamId ? await db.query.teams.findFirst({ where: eq(teams.id, player.teamId) }) : null;
  const [live, history] = await Promise.all([getPlayerLiveStats(playerId), getPlayerHistoricalStats(player.minecraftUsername)]);

  const current = [
    ["AB", live.atBats], ["R", live.runs], ["H", live.hits], ["HR", live.homeRuns],
    ["RBI", live.rbis], ["BB", live.walks], ["SO", live.strikeouts], ["AVG", rate(live.average)],
    ["IP", formatInnings(live.inningsPitched)], ["ER", live.earnedRuns], ["Pitching SO", live.strikeoutsPitched],
    ["BB Allowed", live.walksAllowed], ["ERA", live.inningsPitched ? live.era.toFixed(3) : "-"],
  ];

  return <PageShell wide title={player.displayName} subtitle={[team?.name ?? "Free agent", player.status].join(" · ")}>
    <div className="mb-6"><BackButton /></div>
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Current season</h2>
      {live.gamesLogged === 0 ? <EmptyState>No approved games logged this season yet.</EmptyState> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {current.map(([label, stat]) => <div key={label} className="rounded border border-slate-800/80 bg-slate-900/40 p-3"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold">{stat}</p></div>)}
      </div>}
    </section>
    <section><h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Career history</h2>{history.length ? <PlayerHistory leagueSlug={league.slug}
history={history} /> : <EmptyState>No archived seasons found for this player.</EmptyState>}</section>
  </PageShell>;
}
