import { notFound } from "next/navigation";
import { getPlayerAvatars, getPlayerGameLog, getPlayerHistoricalStats } from "@/db/queries";
import { PageShell } from "@/app/SiteNav";
import { BackButton } from "@/app/players/BackButton";
import { PlayerHead } from "@/app/PlayerHead";
import { PlayerProfile } from "@/app/players/PlayerProfile";
import { TeamLogo } from "@/app/TeamLogo";

export const dynamic = "force-dynamic";

export default async function HistoricalPlayerPage({
  params,
}: {
  params: Promise<{ playerName: string }>;
}) {
  const { playerName } = await params;
  const name = decodeURIComponent(playerName);

  const [history, games, avatars] = await Promise.all([
    getPlayerHistoricalStats(name),
    getPlayerGameLog(name),
    getPlayerAvatars(),
  ]);
  if (history.length === 0) notFound();

  const seasonCount = new Set(history.map((row) => row.seasonId)).size;
  // The team they most recently appeared for leads the header.
  const latest = [...history].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))[0];
  const playedPitching = history.some((row) => (row.inningsPitched ?? 0) > 0);

  return (
    <PageShell wide title={name} subtitle={`${seasonCount} season${seasonCount === 1 ? "" : "s"}`}>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <PlayerHead uuid={avatars[name]} name={name} size={72} className="rounded-md" />
        <div className="min-w-0">
          <p className="text-2xl font-black tracking-tight">{name}</p>
          {latest?.teamName && (
            <span className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <TeamLogo teamName={latest.teamName} className="h-5 w-5" />
              {latest.teamName}
            </span>
          )}
        </div>
        <div className="ml-auto">
          <BackButton />
        </div>
      </div>

      <PlayerProfile
        seasons={history as never}
        games={games as never}
        playedPitching={playedPitching}
      />
    </PageShell>
  );
}
