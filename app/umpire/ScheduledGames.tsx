"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TeamLogo } from "@/app/TeamLogo";

export type Fixture = {
  id: number;
  awayName: string;
  homeName: string;
  /**
   * The series this game belongs to. Season XII games are scheduled to a
   * series window rather than a day, so a specific date would be a guess -
   * the two clubs play whenever they can meet inside the window.
   */
  seriesNumber: number | null;
  seriesWindow: string | null;
  /** The time the two clubs agreed on. */
  scheduledAt: string;
};

/**
 * The remaining schedule, one row per fixture. An umpire picks the game they
 * are about to call rather than describing it, so the scorecard stays attached
 * to the fixture it belongs to and publishing fills that row in instead of
 * adding a second copy of the game to the end of the season.
 */
export function ScheduledGames({ fixtures }: { fixtures: Fixture[] }) {
  const router = useRouter();
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function start(gameId: number) {
    setStarting(gameId);
    setError("");
    try {
      const response = await fetch("/api/scorecards/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      const body = (await response.json()) as { scorecardId?: number; error?: string };
      if (!response.ok || !body.scorecardId) {
        throw new Error(body.error ?? "Could not start the game.");
      }
      router.push(`/umpire/${body.scorecardId}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      setStarting(null);
    }
  }

  if (fixtures.length === 0) {
    return (
      <p className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5 text-center text-sm text-slate-500">
        Nothing to claim. A game appears here once its clubs agree a time for
        it on the schedule.
      </p>
    );
  }

  // Grouped by series, the way the league publishes the schedule.
  const bySeries = new Map<string, { label: string; window: string | null; games: Fixture[] }>();
  for (const fixture of fixtures) {
    const key = fixture.seriesNumber === null ? "rest" : String(fixture.seriesNumber);
    const group = bySeries.get(key) ?? {
      label: fixture.seriesNumber === null ? "Later in the season" : `Series ${fixture.seriesNumber}`,
      window: fixture.seriesWindow,
      games: [],
    };
    group.games.push(fixture);
    bySeries.set(key, group);
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {[...bySeries.values()].map((group) => (
        <section key={group.label}>
          <h3 className="mb-2 flex items-baseline gap-2 border-b border-slate-800/80 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {group.label}
            </span>
            {group.window && (
              <span className="text-[11px] text-slate-500">{group.window}</span>
            )}
          </h3>
          <div className="grid gap-2">
            {group.games.map((fixture) => (
              <div
                key={fixture.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 transition-colors hover:border-slate-700"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <TeamLogo teamName={fixture.awayName} className="h-7 w-7 shrink-0" />
                  <span className="truncate font-semibold">{fixture.awayName}</span>
                  <span className="shrink-0 text-xs text-slate-500">at</span>
                  <TeamLogo teamName={fixture.homeName} className="h-7 w-7 shrink-0" />
                  <span className="truncate font-semibold">{fixture.homeName}</span>
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                  {new Date(fixture.scheduledAt).toLocaleString(undefined, {
                    weekday: "short", month: "short", day: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => start(fixture.id)}
                  disabled={starting !== null}
                  className="shrink-0 rounded-md bg-sky-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
                >
                  {starting === fixture.id ? "Claiming…" : "Claim & score"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
