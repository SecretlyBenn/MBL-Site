"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartGameForm({ teams }: { teams: { id: number; name: string }[] }) {
  const router = useRouter();
  const [awayTeamId, setAwayTeamId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/scorecards/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awayTeamId: Number(awayTeamId), homeTeamId: Number(homeTeamId) }),
      });
      const body = (await response.json()) as { scorecardId?: number; error?: string };
      if (!response.ok || !body.scorecardId) throw new Error(body.error ?? "Could not start the game.");
      router.push(`/umpire/${body.scorecardId}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const ready = awayTeamId && homeTeamId && awayTeamId !== homeTeamId;

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="ui-field-label flex-col !items-start gap-1.5">
          Away
          <select value={awayTeamId} onChange={(event) => setAwayTeamId(event.target.value)} className="ui-select w-56">
            <option value="">Select team…</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <span className="pb-2.5 text-sm text-slate-500">at</span>
        <label className="ui-field-label flex-col !items-start gap-1.5">
          Home
          <select value={homeTeamId} onChange={(event) => setHomeTeamId(event.target.value)} className="ui-select w-56">
            <option value="">Select team…</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={start}
          disabled={!ready || busy}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? "Starting…" : "Start scoring"}
        </button>
      </div>
      {awayTeamId && awayTeamId === homeTeamId && (
        <p className="mt-2 text-xs text-amber-400">A team cannot play itself.</p>
      )}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
