"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type Fixture = {
  id: number;
  scheduledAt: string;
  awayName: string;
  homeName: string;
  /** The day the league published, already formatted for reading. */
  day: string;
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
        Every scheduled game has been played.
      </p>
    );
  }

  // Grouped by day, so the list reads like the schedule the league publishes.
  const byDay = new Map<string, Fixture[]>();
  for (const fixture of fixtures) {
    byDay.set(fixture.day, [...(byDay.get(fixture.day) ?? []), fixture]);
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {[...byDay].map(([day, games]) => (
        <section key={day}>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{day}</h3>
          <div className="grid gap-2">
            {games.map((fixture) => (
              <div
                key={fixture.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3"
              >
                <span className="min-w-0 truncate font-semibold">
                  {fixture.awayName} <span className="text-slate-500">at</span> {fixture.homeName}
                </span>
                <button
                  type="button"
                  onClick={() => start(fixture.id)}
                  disabled={starting !== null}
                  className="shrink-0 rounded-md bg-sky-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
                >
                  {starting === fixture.id ? "Starting…" : "Score this game"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
