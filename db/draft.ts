import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  draftPicks,
  draftRounds,
  draftSignups,
  drafts,
  players,
  rosterMoves,
  rosterSpots,
  teams,
} from "./schema";
import { draftSlots } from "./draft-order";

export { draftSlots } from "./draft-order";

/**
 * The draft.
 *
 * Everything here works on the slots rather than on arithmetic: a draft's
 * order is its picks in `overall` order, written down once when the draft is
 * made and read back as they are. The snake is folded in at that point, so
 * nothing afterwards has to know which mode it was.
 */

/** A draft with its competition, or nothing if there is no such draft. */
export async function getDraft(draftId: number) {
  return getDb().query.drafts.findFirst({ where: eq(drafts.id, draftId) });
}

/**
 * A draft's board: every pick in order, with the club and whoever is in it.
 *
 * One query rather than one per pick. Two hundred rows joined to two small
 * tables is cheap, and the page needs all of it at once to draw the rounds.
 */
export async function getBoard(draftId: number) {
  return getDb()
    .select({
      id: draftPicks.id,
      overall: draftPicks.overall,
      round: draftPicks.round,
      teamId: draftPicks.teamId,
      teamName: teams.name,
      teamAbbreviation: teams.abbreviation,
      teamColor: teams.color,
      playerId: draftPicks.playerId,
      playerName: players.displayName,
      madeAt: draftPicks.madeAt,
    })
    .from(draftPicks)
    .innerJoin(teams, eq(teams.id, draftPicks.teamId))
    .leftJoin(players, eq(players.id, draftPicks.playerId))
    .where(eq(draftPicks.draftId, draftId))
    .orderBy(asc(draftPicks.overall));
}

/** The pick being waited on, or nothing when the draft is over. */
export function onTheClock<T extends { playerId: number | null }>(board: T[]): T | undefined {
  return board.find((pick) => pick.playerId === null);
}

/**
 * Lays out a draft's picks, replacing any that have not been made.
 *
 * Used to create a draft and to change one: an order, a mode or a number of
 * rounds can all be corrected while the draft is still running, and the picks
 * already made are left exactly as they are. A club dropped from the order
 * keeps the players it has taken - undoing those is a separate decision, and
 * doing it silently here would lose them.
 *
 * Deleting before inserting rather than adjusting in place, so running it
 * twice leaves the same thing behind as running it once.
 */
export async function layOutPicks(
  draftId: number,
  teamIds: number[],
  rounds: number,
  reversedByRound?: Map<number, boolean | null>,
) {
  const db = getDb();
  const made = await db
    .select({ overall: draftPicks.overall })
    .from(draftPicks)
    .where(and(eq(draftPicks.draftId, draftId), sql`${draftPicks.playerId} IS NOT NULL`));
  const taken = new Set(made.map((pick) => pick.overall));

  await db
    .delete(draftPicks)
    .where(and(eq(draftPicks.draftId, draftId), isNull(draftPicks.playerId)));

  const slots = draftSlots(teamIds, rounds, reversedByRound).filter(
    (slot) => !taken.has(slot.overall),
  );
  // D1 allows a hundred bound parameters per statement and each row here binds
  // four, so the rows go in twenty at a time rather than all at once.
  for (let index = 0; index < slots.length; index += 20) {
    await db.insert(draftPicks).values(
      slots.slice(index, index + 20).map((slot) => ({ draftId, ...slot })),
    );
  }
}

/**
 * The players a draft may still take: everybody in the pool who has not
 * already gone, narrowed by what was typed.
 *
 * Searched and capped rather than listed, for the same reason `/gm` is: the
 * pool is about twelve hundred names and printing it costs more than a page's
 * whole budget.
 */
export async function draftablePlayers(
  draft: { id: number; poolSource: string },
  league: { id: number; isTournament: boolean },
  round: { round: number; leagueIds: number[] },
  search: string,
  limit = 25,
) {
  const db = getDb();
  const gone = await db
    .select({ playerId: draftPicks.playerId })
    .from(draftPicks)
    .where(and(eq(draftPicks.draftId, draft.id), sql`${draftPicks.playerId} IS NOT NULL`));
  const taken = new Set(gone.map((pick) => pick.playerId as number));

  // A tournament draws on everybody who has played here, because it borrows
  // its players rather than owning them. A competition's own draft draws on
  // its free agents - a man already on one of its clubs is not available, and
  // one belonging to the other competition never was.
  const base = league.isTournament
    ? sql`1 = 1`
    : and(
        isNull(players.teamId),
        sql`(${players.leagueId} IS NULL OR ${players.leagueId} = ${league.id})`,
      );

  // A round tied to one or more competitions takes only their players. A man
  // with no competition at all is left out of such a round rather than let
  // into every one of them: the point of naming them is that the round is
  // somebody's, and an unfiled player is nobody's.
  const roundOnly =
    round.leagueIds.length === 0 ? undefined : inArray(players.leagueId, round.leagueIds);

  // Already drafted is settled in JavaScript rather than in a NOT IN, which
  // would bind one parameter per player taken and run into D1's hundred-
  // parameter ceiling partway through any draft worth holding. Asking for the
  // shortfall as well keeps the list from arriving short.
  const needle = sql`${players.displayName} LIKE ${`%${search.trim()}%`}`;

  if (draft.poolSource === "SIGNUPS") {
    // Only the players who put their names down, and only the sign-ups an
    // admin has matched to somebody - an unmatched one is a name nobody has
    // identified yet, and drafting it would mean inventing the player.
    const rows = await db
      .select({ id: players.id, displayName: players.displayName })
      .from(draftSignups)
      .innerJoin(players, eq(players.id, draftSignups.playerId))
      .where(and(eq(draftSignups.draftId, draft.id), needle, roundOnly))
      .orderBy(asc(players.displayName))
      .limit(limit + taken.size);
    return rows.filter((row) => !taken.has(row.id)).slice(0, limit);
  }

  const rows = await db
    .select({ id: players.id, displayName: players.displayName })
    .from(players)
    .where(and(needle, base, roundOnly))
    .orderBy(asc(players.displayName))
    .limit(limit + taken.size);
  return rows.filter((row) => !taken.has(row.id)).slice(0, limit);
}

/**
 * What each round does differently, by round number.
 *
 * The competitions come back as a list of ids rather than the text they are
 * stored as, so nothing outside this file has to know they share a column.
 */
export async function getRoundRules(draftId: number) {
  const rows = await getDb()
    .select({
      round: draftRounds.round,
      leagueIds: draftRounds.leagueIds,
      reversed: draftRounds.reversed,
    })
    .from(draftRounds)
    .where(eq(draftRounds.draftId, draftId));
  return new Map(
    rows.map((row) => [
      row.round,
      {
        round: row.round,
        leagueIds: (row.leagueIds ?? "")
          .split(",")
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
        reversed: row.reversed ?? false,
      },
    ]),
  );
}

export type RoundRule = { round: number; leagueIds: number[]; reversed: boolean };

/**
 * Replaces what every round does differently.
 *
 * A round left out runs the order as entered and takes anybody, so this is the
 * whole picture each time rather than a set of changes - the same shape the
 * roles and the competitions an account covers are written in.
 */
export async function setRoundRules(draftId: number, rules: RoundRule[]) {
  const db = getDb();
  await db.delete(draftRounds).where(eq(draftRounds.draftId, draftId));
  const rows = rules
    .filter((rule) => rule.leagueIds.length > 0 || rule.reversed)
    .map((rule) => ({
      draftId,
      round: rule.round,
      leagueIds: rule.leagueIds.length > 0 ? rule.leagueIds.join(",") : null,
      reversed: rule.reversed,
    }));
  // Four bound parameters a row against D1's hundred, so twenty at a time.
  for (let index = 0; index < rows.length; index += 20) {
    await db.insert(draftRounds).values(rows.slice(index, index + 20));
  }
}

/** Everybody who has put their name down, newest last, with who they matched. */
export async function getSignups(draftId: number) {
  return getDb()
    .select({
      id: draftSignups.id,
      discordId: draftSignups.discordId,
      discordName: draftSignups.discordName,
      typedName: draftSignups.typedName,
      playerId: draftSignups.playerId,
      playerName: players.displayName,
      leagueId: draftSignups.leagueId,
      positions: draftSignups.positions,
      createdAt: draftSignups.createdAt,
    })
    .from(draftSignups)
    .leftJoin(players, eq(players.id, draftSignups.playerId))
    .where(eq(draftSignups.draftId, draftId))
    .orderBy(asc(draftSignups.createdAt));
}

/**
 * When the pick on the clock runs out, or null if this draft has no clock.
 *
 * Counted from whichever came last: the moment the draft was started, or the
 * moment the pick before this one was made. Worked out here rather than kept
 * in a column, so a pick taken back puts the clock back with it and nothing
 * has to remember to.
 */
export function deadlineFor(
  draft: { pickSeconds: number | null; startedAt: string | null },
  lastMadeAt: string | null,
): string | null {
  if (!draft.pickSeconds || !draft.startedAt) return null;
  const from = Math.max(
    Date.parse(draft.startedAt.replace(" ", "T") + (draft.startedAt.endsWith("Z") ? "" : "Z")),
    lastMadeAt ? Date.parse(lastMadeAt) : 0,
  );
  if (!Number.isFinite(from)) return null;
  return new Date(from + draft.pickSeconds * 1000).toISOString();
}

/** Whether these ids are all clubs of this competition. */
export async function clubsOf(leagueId: number, teamIds: number[]) {
  if (teamIds.length === 0) return [];
  return getDb()
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.leagueId, leagueId), inArray(teams.id, teamIds)));
}

/**
 * Puts a drafted player on the club that took him, and records the move.
 *
 * Which of the two things that means is the same split `/api/roster-moves`
 * makes: a tournament borrows its players, so the club gets a `roster_spots`
 * row and the man's own club, status and competition are left alone; anywhere
 * else a draft pick is an ordinary signing. It is written here rather than
 * shared with that route because the rules around it are different - that
 * route asks whether a man is a free agent and whether the club is yours, and
 * a draft asks only whose turn it is.
 */
export async function placeDraftedPlayer(
  playerId: number,
  team: { id: number; leagueId: number | null },
  isTournament: boolean,
  actingUserId: number,
  note: string,
) {
  const db = getDb();
  if (isTournament) {
    const held = await db
      .select({ id: rosterSpots.id })
      .from(rosterSpots)
      .where(and(eq(rosterSpots.playerId, playerId), eq(rosterSpots.teamId, team.id)));
    // Picking up a player who is somehow already on this club must not leave
    // him with two spots on it.
    if (held.length === 0) {
      await db.insert(rosterSpots).values({ playerId, teamId: team.id });
    }
  } else {
    await db
      .update(players)
      .set({
        teamId: team.id,
        status: "ACTIVE",
        ...(team.leagueId ? { leagueId: team.leagueId } : {}),
      })
      .where(eq(players.id, playerId));
  }

  await db.insert(rosterMoves).values({
    playerId,
    teamId: team.id,
    moveType: "SIGN",
    actingUserId,
    note,
  });
}

/**
 * Takes a drafted player back off the club, for a pick being undone.
 *
 * The mirror of the above, and deliberately not a release: in a competition
 * that owns its players the man goes back to having no club at all, which is
 * where the draft found him.
 */
export async function removeDraftedPlayer(
  playerId: number,
  team: { id: number },
  isTournament: boolean,
  actingUserId: number,
  note: string,
) {
  const db = getDb();
  if (isTournament) {
    await db
      .delete(rosterSpots)
      .where(and(eq(rosterSpots.playerId, playerId), eq(rosterSpots.teamId, team.id)));
  } else {
    await db
      .update(players)
      .set({ teamId: null, status: "ACTIVE" })
      .where(eq(players.id, playerId));
  }

  await db.insert(rosterMoves).values({
    playerId,
    teamId: null,
    moveType: "RELEASE",
    actingUserId,
    note,
  });
}
