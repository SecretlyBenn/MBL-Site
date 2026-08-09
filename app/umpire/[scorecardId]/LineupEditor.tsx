"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POSITIONS } from "@/app/scoring";

type Player = { id: number; name: string };
type Slot = { playerId: string; position: string };

const EMPTY: Slot = { playerId: "", position: "" };

/**
 * One team's batting order. The pitcher bats by default, which is how the
 * league scores it; ticking DH drops the pitcher out of the order and asks
 * which fielder the DH is batting for.
 */
export function LineupEditor({
  scorecardId,
  isHome,
  teamName,
  roster,
}: {
  scorecardId: number;
  isHome: boolean;
  teamName: string;
  roster: Player[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(Array.from({ length: 9 }, () => ({ ...EMPTY })));
  const [useDh, setUseDh] = useState(false);
  const [dhPitcherId, setDhPitcherId] = useState("");
  const [starterId, setStarterId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const update = (index: number, patch: Partial<Slot>) =>
    setSlots((current) => current.map((slot, at) => (at === index ? { ...slot, ...patch } : slot)));

  const chosen = slots.map((slot) => slot.playerId).filter(Boolean);
  const duplicate = new Set(chosen).size !== chosen.length;
  // Under a DH the pitcher is named separately; otherwise they must be batting.
  const pitcher = useDh ? dhPitcherId : starterId;
  const complete =
    slots.every((slot) => slot.playerId && slot.position) &&
    !duplicate &&
    Boolean(pitcher) &&
    (!useDh || slots.some((slot) => slot.position === "DH"));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const rows: {
        playerId: number;
        battingOrder: number | null;
        position: string;
        dhForPlayerId: number | null;
        pitchingOrder: number | null;
      }[] = slots.map((slot, index) => ({
        playerId: Number(slot.playerId),
        battingOrder: index + 1,
        position: slot.position,
        // The DH bats for the pitcher who is not in the order.
        dhForPlayerId: useDh && slot.position === "DH" ? Number(dhPitcherId) : null,
        pitchingOrder: !useDh && Number(slot.playerId) === Number(starterId) ? 1 : null,
      }));

      if (useDh) {
        rows.push({
          playerId: Number(dhPitcherId),
          battingOrder: null,
          position: "P",
          dhForPlayerId: null,
          pitchingOrder: 1,
        });
      }

      const response = await fetch(`/api/scorecards/${scorecardId}/lineup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHome, rows }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save the lineup.");
      setSaved(true);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">{teamName}</h2>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <input type="checkbox" checked={useDh} onChange={(event) => setUseDh(event.target.checked)} />
          Use DH
        </label>
      </div>

      <div className="data-table-shell">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>Player</th>
              <th className="w-28">Position</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, index) => (
              <tr key={index}>
                <td className="text-slate-500">{index + 1}</td>
                <td>
                  <select
                    value={slot.playerId}
                    onChange={(event) => update(index, { playerId: event.target.value })}
                    className="ui-select w-full !py-1"
                  >
                    <option value="">Select…</option>
                    {roster.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={slot.position}
                    onChange={(event) => update(index, { position: event.target.value })}
                    className="ui-select w-full !py-1"
                  >
                    <option value="">—</option>
                    {POSITIONS.filter((position) => useDh || position !== "DH").map((position) => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-2">
        {useDh ? (
          <label className="ui-field-label flex-col !items-start gap-1.5">
            Pitcher (not batting — the DH bats for them)
            <select value={dhPitcherId} onChange={(event) => setDhPitcherId(event.target.value)} className="ui-select w-full">
              <option value="">Select pitcher…</option>
              {roster.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="ui-field-label flex-col !items-start gap-1.5">
            Starting pitcher
            <select value={starterId} onChange={(event) => setStarterId(event.target.value)} className="ui-select w-full">
              <option value="">Select from the order…</option>
              {slots
                .filter((slot) => slot.playerId)
                .map((slot) => roster.find((player) => player.id === Number(slot.playerId)))
                .filter((player): player is Player => Boolean(player))
                .map((player) => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
            </select>
          </label>
        )}

        {duplicate && <p className="text-xs text-amber-400">The same player appears twice.</p>}
        {error && <p className="text-xs text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={!complete || busy}
          className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : saved ? "Saved — update lineup" : `Save ${teamName} lineup`}
        </button>
      </div>
    </section>
  );
}
