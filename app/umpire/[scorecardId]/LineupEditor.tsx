"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FULL_LINEUP, MINIMUM_LINEUP, POSITIONS } from "@/app/scoring";
import { readJson } from "@/app/read-json";

type Player = { id: number; name: string };
type Slot = { playerId: string; position: string };

const EMPTY: Slot = { playerId: "", position: "" };

/**
 * One team's batting order.
 *
 * Everyone bats by default, which is how the league scores it. Ticking DH
 * takes one fielder out of the order and puts a designated hitter in their
 * place - and that fielder is **any** of the nine, not only the pitcher. A side
 * here will bat for a shortstop who cannot hit as readily as for a pitcher, and
 * the editor used to assume the pitcher and offer nothing else.
 *
 * Because the fielder who sits out is no longer necessarily the pitcher, who is
 * starting on the mound is now asked separately every time, rather than being
 * inferred from which box the DH question was in.
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
  const [slots, setSlots] = useState<Slot[]>(
    Array.from({ length: FULL_LINEUP }, () => ({ ...EMPTY })),
  );
  const [useDh, setUseDh] = useState(false);
  /** The fielder the DH bats for: they take the field and never come to the plate. */
  const [benchedId, setBenchedId] = useState("");
  const [benchedPosition, setBenchedPosition] = useState("P");
  const [starterId, setStarterId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const update = (index: number, patch: Partial<Slot>) =>
    setSlots((current) => current.map((slot, at) => (at === index ? { ...slot, ...patch } : slot)));

  // Only the slots that have somebody in them count. A side short of nine is
  // ordinary here, so the order simply runs shorter and comes round sooner -
  // an empty slot at the bottom is one nobody filled, not an incomplete
  // lineup.
  const filled = slots.filter((slot) => slot.playerId);

  // The man the DH bats for counts as chosen too. He is on the card and on the
  // field, so naming him in the order as well would be one player in two
  // places - and the order would come round to somebody who is not batting.
  const chosen = [...filled.map((slot) => slot.playerId), ...(useDh && benchedId ? [benchedId] : [])];
  const duplicate = new Set(chosen).size !== chosen.length;

  /** Everyone on the card, batting or not - the pitcher is one of them. */
  const onCard = [
    ...filled
      .map((slot) => roster.find((player) => player.id === Number(slot.playerId)))
      .filter((player): player is Player => Boolean(player)),
    ...(useDh ? roster.filter((player) => player.id === Number(benchedId)) : []),
  ];

  const complete =
    filled.length >= MINIMUM_LINEUP &&
    filled.every((slot) => slot.position) &&
    !duplicate &&
    // Whoever is on the mound has to be on the card, which he stops being the
    // moment the lineup is rearranged around him.
    Boolean(starterId) &&
    onCard.some((player) => player.id === Number(starterId)) &&
    (!useDh ||
      (filled.some((slot) => slot.position === "DH") && Boolean(benchedId) && Boolean(benchedPosition)));

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
      }[] = filled.map((slot, index) => ({
        playerId: Number(slot.playerId),
        battingOrder: index + 1,
        position: slot.position,
        // Who the DH is batting for - any fielder, not only the pitcher.
        dhForPlayerId: useDh && slot.position === "DH" ? Number(benchedId) : null,
        // The pitcher may now be in the order or out of it, so he is matched
        // by name rather than assumed from whether a DH is in use.
        pitchingOrder: Number(slot.playerId) === Number(starterId) ? 1 : null,
      }));

      if (useDh) {
        rows.push({
          playerId: Number(benchedId),
          battingOrder: null,
          position: benchedPosition,
          dhForPlayerId: null,
          pitchingOrder: Number(benchedId) === Number(starterId) ? 1 : null,
        });
      }

      const response = await fetch(`/api/scorecards/${scorecardId}/lineup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHome, rows }),
      });
      const body = await readJson<{ error?: string }>(response, "Could not save the lineup.");
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
              <th className="w-8" />
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
                <td>
                  {slots.length > MINIMUM_LINEUP && (
                    <button
                      type="button"
                      onClick={() => setSlots((current) => current.filter((_, at) => at !== index))}
                      title="Remove this spot in the order"
                      className="px-1 text-slate-600 transition-colors hover:text-rose-400"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Somebody who turns up late goes in at the bottom, which is where the
          order takes them. A side can also start shorter than nine and grow. */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSlots((current) => [...current, { ...EMPTY }])}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Add a spot at the bottom
        </button>
        <span className="text-[11px] text-slate-500">
          {filled.length} in the order
          {filled.length < MINIMUM_LINEUP && ` - ${MINIMUM_LINEUP} is the fewest that can play`}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {useDh && (
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
            <label className="ui-field-label !flex flex-col !items-start gap-1.5">
              The DH bats for
              <select
                value={benchedId}
                onChange={(event) => setBenchedId(event.target.value)}
                className="ui-select w-full"
              >
                <option value="">Select a fielder…</option>
                {roster.map((player) => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </select>
            </label>
            <label className="ui-field-label !flex flex-col !items-start gap-1.5">
              Their position
              <select
                value={benchedPosition}
                onChange={(event) => setBenchedPosition(event.target.value)}
                className="ui-select w-full"
              >
                {POSITIONS.filter((position) => position !== "DH").map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Asked whether or not a DH is in use, because the man who sits out
            is no longer necessarily the pitcher. */}
        <label className="ui-field-label !flex flex-col !items-start gap-1.5">
          Starting pitcher
          <select
            value={starterId}
            onChange={(event) => setStarterId(event.target.value)}
            className="ui-select w-full"
          >
            <option value="">Select from the card…</option>
            {onCard.map((player) => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </label>

        {useDh && benchedId && !filled.some((slot) => slot.position === "DH") && (
          <p className="text-xs text-amber-400">
            Give one spot in the order the DH position.
          </p>
        )}

        {duplicate && <p className="text-xs text-amber-400">The same player appears twice.</p>}
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

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
