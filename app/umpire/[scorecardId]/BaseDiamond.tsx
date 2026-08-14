"use client";

import { useRef, useState } from "react";
import type { BaseName, Bases } from "@/app/bases";

type Runner = { playerId: number; name: string; base: BaseName };

/**
 * The bases, drawn as a diamond, with whoever is standing on them.
 *
 * A runner is dragged to where they ended up: to the next bag to advance them,
 * to home to score them. Every move asks why - a stolen base is the runner's
 * stat, an error is the fielder's, and a run that came home on a mistake is
 * unearned. Nothing here is a forced advance: a forced runner is one the batter
 * pushed along, and the batter's own result is recorded through the at-bat
 * panel rather than by dragging.
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
  /** Called with the runner, where they went, and why. */
  onMove: (
    playerId: number,
    to: BaseName | "home",
    reason: "PLAY" | "STEAL" | "ERROR" | "OTHER",
    note?: string,
  ) => void;
  busy?: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  /**
   * The runner picked by clicking rather than dragging. Dragging is fiddly on
   * a trackpad and impossible on a touchscreen, and an umpire scoring a live
   * game should not have to fight the interface - clicking a runner and then a
   * base does the same thing.
   */
  const [picked, setPicked] = useState<number | null>(null);
  /**
   * Blocks a second move going out for the same gesture. A drop is followed by
   * a click on the same base, and `busy` arrives from the parent a render too
   * late to stop it - so the first move scored the runner and the second asked
   * the server to move someone who was already home.
   */
  const inFlight = useRef(false);
  const [over, setOver] = useState<BaseName | "home" | null>(null);
  const [asking, setAsking] = useState<{ playerId: number; to: BaseName | "home" } | null>(null);
  /** Free text for "something else", so the reason is not lost. */
  const [why, setWhy] = useState("");

  const runners: Runner[] = (["first", "second", "third"] as const).flatMap((base) =>
    bases[base] === null
      ? []
      : [{ base, playerId: bases[base] as number, name: nameOf[bases[base] as number] ?? "Runner" }],
  );

  const runnerAt = (base: BaseName) => runners.find((runner) => runner.base === base) ?? null;

  const ORDER: (BaseName | "home")[] = ["first", "second", "third", "home"];

  function move(playerId: number | null, to: BaseName | "home") {
    setOver(null);
    setDragging(null);
    setPicked(null);
    if (playerId === null || busy || inFlight.current) return;

    const runner = runners.find((row) => row.playerId === playerId);
    if (!runner) return;

    // Landing a runner where they already are is not a move.
    if (to === runner.base) return;

    // Putting a runner back is a correction, not something that happened on
    // the field - the runners are placed forward automatically now, so getting
    // one back to where they held up should not be interrogated.
    if (ORDER.indexOf(to) < ORDER.indexOf(runner.base)) {
      send(playerId, to, "PLAY");
      return;
    }

    // Everything else happened for a reason, and the reason is someone's stat.
    setWhy("");
    setAsking({ playerId, to });
  }

  /** Every path out of here goes through one gate, so none can double-fire. */
  function send(
    playerId: number,
    to: BaseName | "home",
    reason: "PLAY" | "STEAL" | "ERROR" | "OTHER",
    note?: string,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    // Released on the next tick: the trailing click from a drop has fired by
    // then, and the refresh that follows re-renders this from scratch anyway.
    setTimeout(() => { inFlight.current = false; }, 400);
    onMove(playerId, to, reason, note);
  }

  const baseStyle = (base: BaseName | "home") => {
    const hovered = over === base;
    const pickedRunner = picked === null ? null : runners.find((row) => row.playerId === picked);
    // Every base except the one they are standing on, since a runner can be
    // put back as well as sent on.
    const reachable =
      pickedRunner !== null && pickedRunner !== undefined && base !== pickedRunner.base;
    // An occupied bag is lit. The umpire should be able to read the state of
    // the bases from across the room, without stopping to find the names.
    const occupied = base !== "home" && runnerAt(base) !== null;
    return [
      "absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center",
      "justify-center rounded-md border-2 transition-colors",
      hovered
        ? "border-sky-300 bg-sky-500/40 ring-2 ring-sky-400/60"
        : reachable
          ? "cursor-pointer border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/50"
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
        onDragStart={(event) => {
          // A drag carrying no data is rejected outright by the browser, which
          // is why dropping a runner did nothing at all.
          event.dataTransfer.setData("text/plain", String(runner.playerId));
          event.dataTransfer.effectAllowed = "move";
          setDragging(runner.playerId);
        }}
        onDragEnd={() => { setDragging(null); setOver(null); }}
        onClick={(event) => {
          event.stopPropagation();
          setPicked((current) => (current === runner.playerId ? null : runner.playerId));
        }}
        className={`-rotate-45 cursor-grab rounded px-1 text-center text-[10px] font-bold leading-tight active:cursor-grabbing ${
          picked === runner.playerId
            ? "bg-sky-500 text-white ring-2 ring-sky-300"
            : "text-amber-200"
        }`}
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
          : picked !== null
            ? "Now pick the base they reached, or home if they scored."
            : "Tap a runner then a base, or drag them across. Runners move up with the batter already - drag one back if they held."}
      </p>

      <div className="relative mx-auto h-52 w-52">
        {spots.map((spot) => (
          <div
            key={spot.base}
            style={spot.style}
            className={baseStyle(spot.base)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOver(spot.base);
            }}
            onDragLeave={() => setOver((current) => (current === spot.base ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              // The id travels with the drag, so a re-render mid-drag cannot
              // lose track of who is being moved.
              const carried = Number(event.dataTransfer.getData("text/plain"));
              move(Number.isFinite(carried) && carried > 0 ? carried : dragging, spot.base);
            }}
            onClick={() => {
              // A drop is followed by a click on the same base. Only a runner
              // chosen by clicking is moved this way, and the drop already
              // cleared that, so the trailing click finds nothing to do.
              if (picked === null) return;
              move(picked, spot.base);
            }}
          >
            {label(spot.base)}
          </div>
        ))}
      </div>

      {asking && (
        <div className="mt-3 rounded-md border border-sky-800 bg-sky-950/40 p-3">
          <p className="mb-2 text-xs text-slate-200">
            How did {nameOf[asking.playerId] ?? "the runner"} reach{" "}
            {asking.to === "home" ? "home" : asking.to}?
          </p>
          <div className="grid gap-1.5">
            {/* Moving up on the ball just put in play is the commonest case,
                so it leads and carries no note - the play it came from is
                already on the card. A steal and an error are each somebody's
                stat, so they are named rather than lumped in with it. */}
            <button
              type="button"
              onClick={() => { send(asking.playerId, asking.to, "PLAY"); setAsking(null); }}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
            >
              On the last play
            </button>
            <button
              type="button"
              onClick={() => { send(asking.playerId, asking.to, "STEAL"); setAsking(null); }}
              className="rounded-md border border-sky-700 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-950/40"
            >
              Stolen base
            </button>
            <button
              type="button"
              onClick={() => { send(asking.playerId, asking.to, "ERROR"); setAsking(null); }}
              className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/40"
            >
              On an error
            </button>
            <div className="flex gap-1.5">
              <input
                value={why}
                onChange={(event) => setWhy(event.target.value)}
                placeholder="Wild pitch, balk, on the throw…"
                className="ui-select w-full !py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => { send(asking.playerId, asking.to, "OTHER", why); setAsking(null); }}
                className="shrink-0 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Something else
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAsking(null)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
