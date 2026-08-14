import { RESULT_BY_CODE, isSkip, type ResultCode } from "./scoring.ts";

/**
 * Who is standing on each base.
 *
 * The scorer's questions are answered from this rather than asked. A single
 * with nobody on cannot have driven a run in, so the screen does not ask; a
 * single with a runner on third asks only whether that one runner scored. The
 * diamond draws straight from the same state, so what the umpire sees and what
 * the box score believes cannot drift apart.
 */
export type Bases = {
  first: number | null;
  second: number | null;
  third: number | null;
};

export const EMPTY_BASES: Bases = { first: null, second: null, third: null };

export const BASE_NAMES = ["first", "second", "third"] as const;
export type BaseName = (typeof BASE_NAMES)[number];

/** Runners on base, nearest home first - the order they would score in. */
export function runnersOn(bases: Bases): { base: BaseName; playerId: number }[] {
  return (["third", "second", "first"] as const).flatMap((base) =>
    bases[base] === null ? [] : [{ base, playerId: bases[base] as number }],
  );
}

export const isEmpty = (bases: Bases) => runnersOn(bases).length === 0;

/** How many runners are aboard, which is the most that can score on a play. */
export const runnerCount = (bases: Bases) => runnersOn(bases).length;

/**
 * Where the batter ends up on a clean result, or null when they are out or it
 * cannot be inferred. A walk and a single both put the batter on first; an
 * extra-base hit is self-describing.
 */
export function batterDestination(result: string): BaseName | "home" | null {
  const definition = RESULT_BY_CODE.get(result as ResultCode);
  if (!definition) return null;
  if (definition.code === "HR") return "home";
  if (definition.code === "3B") return "third";
  if (definition.code === "2B") return "second";
  if (definition.code === "1B") return "first";
  // A walk, hit-by-pitch, interference, or reaching on an error all put the
  // batter on first without a hit.
  if (definition.group === "On base" || definition.isWalk) return "first";
  return null;
}

/**
 * A forced runner has nowhere to retreat to: the batter is taking their base,
 * and every base behind them is occupied. Used to decide whether moving a
 * runner needs to be questioned as a steal or is simply what had to happen.
 */
export function forcedRunners(bases: Bases): BaseName[] {
  if (bases.first === null) return [];
  if (bases.second === null) return ["first"];
  if (bases.third === null) return ["first", "second"];
  return ["first", "second", "third"];
}

/**
 * The bases after a play, given who scored and where the batter ended up.
 *
 * Runners are advanced from the lead runner back, so nobody is ever placed on
 * a base that the runner ahead of them has not yet vacated. Anything the
 * caller states explicitly - who scored, where the batter went - wins over the
 * inference, because the umpire watched the play and this did not.
 */
export function advance(
  bases: Bases,
  {
    batterPlayerId,
    result,
    scored,
    batterTo,
    outRunners = [],
  }: {
    batterPlayerId: number;
    result: string;
    /** Runners the umpire says crossed the plate. */
    scored: number[];
    /** Overrides the destination inferred from the result. */
    batterTo?: BaseName | "home" | null;
    /** Runners retired on the play, who leave the bases without scoring. */
    outRunners?: number[];
  },
): {
  bases: Bases;
  /**
   * Runs scored by runners. The batter is not counted here even when they came
   * all the way round - the caller records that separately, and adding it here
   * too would score them twice.
   */
  runs: number;
} {
  // A skipped batter never took the plate, so the bases are untouched.
  if (isSkip(result)) return { bases, runs: 0 };

  // Only runners actually standing on a base can score or be put out. A name
  // that is not out there earns nothing: the screen can offer a stale list, and
  // counting it would invent a run - which is how a game reached 3-0 with the
  // bases still loaded.
  const aboard = new Set(runnersOn(bases).map((runner) => runner.playerId));
  const realScorers = scored.filter((playerId) => aboard.has(playerId));

  const gone = new Set([...realScorers, ...outRunners]);
  const remaining: Bases = {
    first: bases.first !== null && !gone.has(bases.first) ? bases.first : null,
    second: bases.second !== null && !gone.has(bases.second) ? bases.second : null,
    third: bases.third !== null && !gone.has(bases.third) ? bases.third : null,
  };

  const destination = batterTo === undefined ? batterDestination(result) : batterTo;

  // A home run clears the bases: everyone aboard scores along with the batter.
  if (destination === "home") {
    // Everyone aboard scores. The batter is counted by the caller, which
    // records them separately - see the note on the return type.
    return { bases: EMPTY_BASES, runs: runnerCount(bases) };
  }

  const next: Bases = { ...remaining };

  // On a hit the runners go with the batter: a single moves everyone up one,
  // a double up two. That is what happens on the field nearly every time, so
  // it is the starting point rather than something the umpire has to enter -
  // and a runner who held up, or took an extra base, is dragged to where they
  // actually finished.
  //
  // Only hits do this. A walk pushes along only the runners with nowhere to
  // stand, which the forcing below handles.
  const step = RESULT_BY_CODE.get(result as ResultCode)?.isHit
    ? RESULT_BY_CODE.get(result as ResultCode)?.bases ?? 0
    : 0;

  let carriedHome = 0;
  if (step > 0) {
    const order: BaseName[] = ["first", "second", "third"];
    // Lead runner first, so nobody is put on a bag the runner ahead has yet to
    // leave.
    for (let index = order.length - 1; index >= 0; index -= 1) {
      const from = order[index];
      const runner = next[from];
      if (runner === null) continue;
      next[from] = null;
      const target = index + step;
      if (target >= order.length) carriedHome += 1;
      else next[order[target]] = runner;
    }
  }

  if (destination) {
    if (next[destination] !== null) {
      // The base the batter is taking is occupied, so its runner is forced up.
      const forcedOrder: BaseName[] = ["first", "second", "third"];
      let index = forcedOrder.indexOf(destination);
      let carrying: number | null = next[destination];
      next[destination] = null;
      while (carrying !== null && index < forcedOrder.length - 1) {
        index += 1;
        const base = forcedOrder[index];
        const displaced: number | null = next[base];
        next[base] = carrying;
        carrying = displaced;
      }
      // A runner pushed past third scores; the caller normally states this, but
      // a forced run is not optional.
      if (carrying !== null) carriedHome += 1;
    }

    next[destination] = batterPlayerId;
  }

  return { bases: next, runs: realScorers.length + carriedHome };
}

/** Serialised for storage - the column holds JSON so the shape can grow. */
export const encodeBases = (bases: Bases) => JSON.stringify(bases);

export const encodeRunners = (playerIds: number[]) => JSON.stringify(playerIds);

/** Player ids of the runners who scored on a play. */
export function decodeRunners(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function decodeBases(value: string | null): Bases {
  if (!value) return EMPTY_BASES;
  try {
    const parsed = JSON.parse(value) as Partial<Bases>;
    return {
      first: parsed.first ?? null,
      second: parsed.second ?? null,
      third: parsed.third ?? null,
    };
  } catch {
    return EMPTY_BASES;
  }
}
