"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POSITIONS, type Position } from "@/app/scoring";
import { readJson } from "@/app/read-json";

type LineupMember = { playerId: number; name: string; position: string; battingOrder: number | null };
type BenchMember = { id: number; name: string };

/**
 * Bringing someone off the bench, for either side and at any point.
 *
 * Both teams are offered because a substitution is not tied to who is batting -
 * a pitching change happens while the other side is up, and a pinch hitter is
 * named before the half-inning turns over. Restricting this to the fielding
 * team would mean waiting for the game to come round before recording
 * something that already happened.
 */
export function SubstitutionPanel({
  scorecardId,
  awayName,
  homeName,
  lineups,
  bench,
  busy,
}: {
  scorecardId: number;
  awayName: string;
  homeName: string;
  lineups: (LineupMember & { isHome: boolean })[];
  bench: { away: BenchMember[]; home: BenchMember[] };
  busy?: boolean;
}) {
  const router = useRouter();
  const [side, setSide] = useState<"away" | "home">("away");
  const [outId, setOutId] = useState("");
  const [inId, setInId] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isHome = side === "home";
  const sideLineup = lineups
    .filter((row) => row.isHome === isHome)
    .sort((a, b) => (a.battingOrder ?? 99) - (b.battingOrder ?? 99));
  const sideBench = isHome ? bench.home : bench.away;

  const outgoing = sideLineup.find((row) => String(row.playerId) === outId);

  async function submit() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/substitute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outPlayerId: Number(outId),
          inPlayerId: Number(inId),
          position: position || undefined,
        }),
      });
      const body = await readJson<{ battingOrder?: number | null; keptAtBats?: number }>(
        response,
        "Could not make the substitution.",
      );
      setNotice(
        body.battingOrder
          ? `In at ${body.battingOrder} in the order. ${body.keptAtBats ?? 0} earlier at-bat${
              body.keptAtBats === 1 ? "" : "s"
            } stay with the player who came out.`
          : "Substitution recorded.",
      );
      setOutId("");
      setInId("");
      setPosition("");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h3 className="panel-title">Substitution</h3>
        <div className="flex gap-1">
          {(["away", "home"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setSide(option); setOutId(""); setInId(""); setPosition(""); }}
              className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${
                side === option
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {option === "away" ? awayName : homeName}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <label className="ui-field-label flex-col !items-start gap-1">
          Coming out
          <select
            value={outId}
            onChange={(event) => setOutId(event.target.value)}
            className="ui-select w-full"
          >
            <option value="">Choose a player…</option>
            {sideLineup.map((row) => (
              <option key={row.playerId} value={row.playerId}>
                {row.battingOrder ? `${row.battingOrder}. ` : ""}{row.name} ({row.position})
              </option>
            ))}
          </select>
        </label>

        <label className="ui-field-label flex-col !items-start gap-1">
          Going in
          <select
            value={inId}
            onChange={(event) => setInId(event.target.value)}
            className="ui-select w-full"
            disabled={sideBench.length === 0}
          >
            <option value="">
              {sideBench.length === 0 ? "Nobody on the bench" : "Choose a player…"}
            </option>
            {sideBench.map((player) => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </label>

        <label className="ui-field-label flex-col !items-start gap-1">
          Position
          <select
            value={position}
            onChange={(event) => setPosition(event.target.value as Position | "")}
            className="ui-select w-full"
          >
            {/* Taking over the same position is the common case, so it leads. */}
            <option value="">
              {outgoing ? `Same as before (${outgoing.position})` : "Same as before"}
            </option>
            {POSITIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        {notice && <p className="text-[11px] text-emerald-400">{notice}</p>}
        {error && <p className="text-[11px] text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={busy || working || !outId || !inId}
          className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
        >
          {working ? "Recording…" : "Make the substitution"}
        </button>
      </div>
    </section>
  );
}
