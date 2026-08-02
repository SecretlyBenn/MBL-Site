"use client";

import { useState } from "react";

type Option = { id: number; label: string };

type LineRow = {
  playerId: number | "";
  atBats: string;
  hits: string;
  runs: string;
  rbis: string;
  homeRuns: string;
  walks: string;
  strikeouts: string;
  inningsPitched: string;
  earnedRuns: string;
  strikeoutsPitched: string;
  walksAllowed: string;
};

const emptyRow: LineRow = {
  playerId: "",
  atBats: "0",
  hits: "0",
  runs: "0",
  rbis: "0",
  homeRuns: "0",
  walks: "0",
  strikeouts: "0",
  inningsPitched: "0",
  earnedRuns: "0",
  strikeoutsPitched: "0",
  walksAllowed: "0",
};

export function SubmitScorecardForm({
  games,
  players,
}: {
  games: Option[];
  players: Option[];
}) {
  const [gameId, setGameId] = useState<number | "">(games[0]?.id ?? "");
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [lines, setLines] = useState<LineRow[]>([{ ...emptyRow }]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateLine(index: number, patch: Partial<LineRow>) {
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/scorecards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
          lines: lines
            .filter((row) => row.playerId !== "")
            .map((row) => ({
              playerId: row.playerId,
              atBats: Number(row.atBats),
              hits: Number(row.hits),
              runs: Number(row.runs),
              rbis: Number(row.rbis),
              homeRuns: Number(row.homeRuns),
              walks: Number(row.walks),
              strikeouts: Number(row.strikeouts),
              inningsPitched: Number(row.inningsPitched),
              earnedRuns: Number(row.earnedRuns),
              strikeoutsPitched: Number(row.strikeoutsPitched),
              walksAllowed: Number(row.walksAllowed),
            })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${response.status})`);
      }

      setStatus("done");
      setLines([{ ...emptyRow }]);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Game
          <select
            className="rounded border p-2"
            value={gameId}
            onChange={(event) => setGameId(Number(event.target.value))}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Home score
          <input
            className="rounded border p-2"
            type="number"
            min={0}
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Away score
          <input
            className="rounded border p-2"
            type="number"
            min={0}
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Player stat lines (optional)</h2>
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline"
            onClick={() => setLines((rows) => [...rows, { ...emptyRow }])}
          >
            + Add player line
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((row, index) => (
            <div key={index} className="rounded border p-3">
              <select
                className="mb-2 w-full rounded border p-2 text-sm"
                value={row.playerId}
                onChange={(event) => updateLine(index, { playerId: Number(event.target.value) })}
              >
                <option value="">Select player...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {(
                  [
                    ["atBats", "AB"],
                    ["hits", "H"],
                    ["runs", "R"],
                    ["rbis", "RBI"],
                    ["homeRuns", "HR"],
                    ["walks", "BB"],
                    ["strikeouts", "SO"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-1 text-xs">
                    {label}
                    <input
                      className="rounded border p-1"
                      type="number"
                      min={0}
                      value={row[field]}
                      onChange={(event) => updateLine(index, { [field]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">Pitching (if applicable)</p>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["inningsPitched", "IP"],
                    ["earnedRuns", "ER"],
                    ["strikeoutsPitched", "K"],
                    ["walksAllowed", "BB"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-1 text-xs">
                    {label}
                    <input
                      className="rounded border p-1"
                      type="number"
                      min={0}
                      step="0.1"
                      value={row[field]}
                      onChange={(event) => updateLine(index, { [field]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "saving" || gameId === ""}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {status === "saving" ? "Submitting..." : "Submit scorecard"}
      </button>

      {status === "done" && (
        <p className="text-green-600">Submitted - waiting on head umpire review.</p>
      )}
      {status === "error" && <p className="text-red-600">{errorMessage}</p>}
    </form>
  );
}
