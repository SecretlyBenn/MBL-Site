import { notFound } from "next/navigation";
import { getPlayerAvatars, getPlayerGameLog, getPlayerHistoricalStats, getPlayerRosterIdentity, getPrimaryPositions } from "@/db/queries";
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
        <div className="-mx-6 -mt-5 mb-6 border-b border-slate-800/80 bg-slate-900/40 px-6 py-6">
          <div className="flex flex-wrap items-center gap-5">
            <PlayerHead uuid={avatars[name]} name={name} size={96} className="rounded-lg" />
            <div className="min-w-0">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.15em] text-sky-400">
                {[jersey, position].filter(Boolean).join(" · ")}
              </p>
              <h1 className="text-4xl font-black tracking-tight">{name}</h1>
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
          </div>
        </div>
      }
    >
      <PlayerProfile
        seasons={history as never}
        games={games as never}
        playedPitching={playedPitching}
      />
    </PageShell>
  );
}
