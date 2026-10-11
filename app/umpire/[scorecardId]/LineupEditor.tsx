"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FULL_LINEUP, MINIMUM_LINEUP, POSITIONS } from "@/app/scoring";
import { readJson } from "@/app/read-json";

type Player = { id: number; name: string };
type Slot = { playerId: string; position: string };

/** A lineup already saved for this side, as the card holds it. */
type Saved = {
  playerId: number;
  battingOrder: number | null;
  position: string;
  dhForPlayerId: number | null;
  pitchingOrder: number | null;
};

const EMPTY: Slot = { playerId: "", position: "" };

/**
 * The saved card in this editor's own terms.
 *
 * A lineup that is already in is reopened to be corrected, not retyped, so it
 * comes back as it stands. Opening blank meant moving one man cost all ten
 * names again, which is the sort of thing nobody does twice - and the reason
 * one card was fixed from the defence panel instead.
 */
function asSlots(saved: Saved[]) {
  const order = [...saved]
    .filter((row) => row.battingOrder !== null)
    .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));
  const dh = saved.find((row) => row.position === "DH");
  // Who the designated hitter bats for is named on the DH's own row, and that
  // man is on the card without a turn in the order.
  const fielding = dh ? saved.find((row) => row.playerId === dh.dhForPlayerId) : undefined;
  const starter = saved.find((row) => row.pitchingOrder === 1);
  return {
    slots: order.map((row) => ({ playerId: String(row.playerId), position: row.position })),
    useDh: Boolean(dh),
    benchedId: fielding ? String(fielding.playerId) : "",
    benchedPosition: fielding?.position ?? "P",
    starterId: starter ? String(starter.playerId) : "",
  };
}

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
  existing = [],
  benchLimit = null,
  existingBench = [],
}: {
  scorecardId: number;
  isHome: boolean;
  teamName: string;
  roster: Player[];
  /** The lineup this side already has, if it is being changed rather than set. */
  existing?: Saved[];
  /**
   * How many this side may name on the bench, or null where its competition
   * does not declare one and a substitution may bring in anybody on the
   * roster. The MBL names up to five; the MCBA names none.
   */
  benchLimit?: number | null;
  /** Who is already named there, when the lineup is being changed. */
  existingBench?: number[];
}) {
  const router = useRouter();
  // Read once, when the editor opens. After that the screen is the truth: a
  // refresh behind a save must not pull a half-finished change back to what
  // the database says.
  const [opened] = useState(() => asSlots(existing));
  const [slots, setSlots] = useState<Slot[]>(
    opened.slots.length > 0
      ? opened.slots
      : Array.from({ length: FULL_LINEUP }, () => ({ ...EMPTY })),
  );
  const [useDh, setUseDh] = useState(opened.useDh);
  /** The fielder the DH bats for: they take the field and never come to the plate. */
  const [benchedId, setBenchedId] = useState(opened.benchedId);
  const [benchedPosition, setBenchedPosition] = useState(opened.benchedPosition);
  const [starterId, setStarterId] = useState(opened.starterId);
  /**
   * The bench, where this competition has one: the only players who may come
   * into the game once it starts. Up to the limit rather than exactly it - a
   * club that can only find three substitutes still has a game to play - so
   * the empty rows are left empty and dropped on the way out.
   */
  const [reserves, setReserves] = useState<string[]>(() =>
    Array.from({ length: benchLimit ?? 0 }, (_, at) =>
      existingBench[at] === undefined ? "" : String(existingBench[at]),
    ),
  );
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
  const chosen = [
    ...filled.map((slot) => slot.playerId),
    ...(useDh && benchedId ? [benchedId] : []),
    // A man on the bench is not in the game, so naming him in the order as
    // well would offer him as a substitute for a position he is standing in.
    ...reserves.filter(Boolean),
  ];
  const duplicate = new Set(chosen).size !== chosen.length;

  // Nor can two of them be standing in the same place, DH included - only one
  // man bats for somebody. Nothing checked this, and because the starting
  // pitcher is asked for separately from the dropdowns a World Series card
  // went in with two players at P and nobody at first base.
  const places = [
    ...filled.map((slot) => slot.position).filter(Boolean),
    ...(useDh && benchedId ? [benchedPosition] : []),
  ];
  const shared = new Set(places).size !== places.length;

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
    !shared &&
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
      const bench = reserves.filter(Boolean).map(Number);

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
        body: JSON.stringify({ isHome, rows, bench }),
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

        {/* Only where the competition names one. Everything above decides who
            starts; this decides who is allowed to come on afterwards, and
            after the first pitch it cannot be changed - which is the point of
            asking for it here. */}
        {benchLimit !== null && (
          <div>
            <p className="ui-field-label mb-1.5">
              Bench — up to {benchLimit}, and only these can come into the game
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {reserves.map((playerId, index) => (
                <select
                  key={index}
                  value={playerId}
                  onChange={(event) =>
                    setReserves((current) =>
                      current.map((held, at) => (at === index ? event.target.value : held)),
                    )
                  }
                  className="ui-select w-full !py-1"
                >
                  <option value="">Nobody</option>
                  {roster.map((player) => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {reserves.filter(Boolean).length === 0
                ? "Nobody named, so this side cannot substitute."
                : `${reserves.filter(Boolean).length} named.`}
            </p>
          </div>
        )}

        {useDh && benchedId && !filled.some((slot) => slot.position === "DH") && (
          <p className="text-xs text-amber-400">
            Give one spot in the order the DH position.
          </p>
        )}

        {duplicate && <p className="text-xs text-amber-400">The same player appears twice.</p>}
        {shared && <p className="text-xs text-amber-400">Two players are in the same position.</p>}
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={!complete || busy}
          className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:opacity-40"
        >
          {busy
            ? "Saving…"
            : saved
              ? "Saved — update lineup"
              : `${existing.length > 0 ? "Update" : "Save"} ${teamName} lineup`}
        </button>
      </div>
    </section>
  );
}
