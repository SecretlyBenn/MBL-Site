"use client";

import { useState } from "react";
import type { BaseName, Bases } from "@/app/bases";
import { forcedRunners } from "@/app/bases";

type Runner = { playerId: number; name: string; base: BaseName };

/**
 * The bases, drawn as a diamond, with whoever is standing on them.
 *
 * A runner is dragged to where they ended up: to the next bag to advance them,
 * to home to score them. Advancing to a base nobody forced them to asks whether
 * they stole it, because that is the only case where the reason matters - a
 * forced runner had no choice, and asking would be noise on every walk.
 *
 * This is a between-plays view. The batter's result is still recorded through
 * the at-bat panel; this handles what the runners did on their own.
 */
export function BaseDiamond({
  bases,
  nameOf,
  onMove,
  busy,
}: {
  bases: Bases;
  nameOf: Record<number, string>;
  /** Called with the runner, where they went, and whether it was a steal. */
  onMove: (playerId: number, to: BaseName | "home", stole: boolean) => void;
  busy?: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<BaseName | "home" | null>(null);
  const [asking, setAsking] = useState<{ playerId: number; to: BaseName | "home" } | null>(null);

  const forced = forcedRunners(bases);

  const runners: Runner[] = (["first", "second", "third"] as const).flatMap((base) =>
    bases[base] === null
      ? []
      : [{ base, playerId: bases[base] as number, name: nameOf[bases[base] as number] ?? "Runner" }],
  );

  const runnerAt = (base: BaseName) => runners.find((runner) => runner.base === base) ?? null;

  const ORDER: (BaseName | "home")[] = ["first", "second", "third", "home"];

  function drop(to: BaseName | "home") {
    setOver(null);
    const playerId = dragging;
    setDragging(null);
    if (playerId === null || busy) return;

    const runner = runners.find((row) => row.playerId === playerId);
    if (!runner) return;

    // Only forward moves make sense; a runner does not go back a base.
    if (ORDER.indexOf(to) <= ORDER.indexOf(runner.base)) return;

    // One base, unforced, is the shape of a steal. Anything further is a play
    // the umpire will describe through the at-bat panel instead.
    const oneBase = ORDER.indexOf(to) === ORDER.indexOf(runner.base) + 1;
    if (oneBase && !forced.includes(runner.base)) {
      setAsking({ playerId, to });
      return;
    }
    onMove(playerId, to, false);
  }

  const baseStyle = (base: BaseName | "home") => {
    const hovered = over === base;
    // An occupied bag is lit. The umpire should be able to read the state of
    // the bases from across the room, without stopping to find the names.
    const occupied = base !== "home" && runnerAt(base) !== null;
    return [
      "absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center",
      "justify-center rounded-md border-2 transition-colors",
      hovered
        ? "border-sky-300 bg-sky-500/40 ring-2 ring-sky-400/60"
        : occupied
          ? "border-amber-400 bg-amber-400/20 shadow-[0_0_20px_-2px_rgba(251,191,36,0.5)]"
          : "border-slate-700 bg-slate-900",
    ].join(" ");
  };

  const label = (base: BaseName | "home") => {
    const runner = base === "home" ? null : runnerAt(base);
    if (!runner) {
      return (
        <span className="-rotate-45 text-[9px] font-bold uppercase tracking-wider text-slate-600">
          {base === "home" ? "Home" : base.slice(0, 3)}
        </span>
      );
    }
    return (
      <span
        draggable={!busy}
        onDragStart={() => setDragging(runner.playerId)}
        onDragEnd={() => { setDragging(null); setOver(null); }}
        className="-rotate-45 cursor-grab px-0.5 text-center text-[10px] font-bold leading-tight text-amber-200 active:cursor-grabbing"
        title={`${runner.name} on ${runner.base}`}
      >
        {runner.name.slice(0, 8)}
      </span>
    );
  };

  const spots: { base: BaseName | "home"; style: React.CSSProperties }[] = [
    { base: "second", style: { left: "50%", top: "8%" } },
    { base: "third", style: { left: "12%", top: "50%" } },
    { base: "first", style: { left: "88%", top: "50%" } },
    { base: "home", style: { left: "50%", top: "92%" } },
  ];

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        On base
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        {runners.length === 0
          ? "Bases empty."
          : "Drag a runner to the base they reached, or to home if they scored."}
      </p>

      <div className="relative mx-auto h-52 w-52">
        {spots.map((spot) => (
          <div
            key={spot.base}
            style={spot.style}
            className={baseStyle(spot.base)}
            onDragOver={(event) => { event.preventDefault(); setOver(spot.base); }}
            onDragLeave={() => setOver((current) => (current === spot.base ? null : current))}
            onDrop={() => drop(spot.base)}
          >
            {label(spot.base)}
          </div>
        ))}
      </div>

      {asking && (
        <div className="mt-3 rounded-md border border-sky-800 bg-sky-950/40 p-3">
          <p className="mb-2 text-xs text-slate-200">
            Did {nameOf[asking.playerId] ?? "the runner"} steal{" "}
            {asking.to === "home" ? "home" : asking.to}?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onMove(asking.playerId, asking.to, true); setAsking(null); }}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
            >
              Stolen base
            </button>
            <button
              type="button"
              onClick={() => { onMove(asking.playerId, asking.to, false); setAsking(null); }}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              No, just advanced
            </button>
            <button
              type="button"
              onClick={() => setAsking(null)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
