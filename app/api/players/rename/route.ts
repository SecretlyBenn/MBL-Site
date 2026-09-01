import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import {
  historicalGameStats,
  historicalPlayerStats,
  historicalRosterEntries,
  minecraftProfiles,
  players,
} from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type RenamePayload = {
  /** The name as it stands today. */
  from: string;
  /** The name they go by now. */
  to: string;
};

/**
 * Renames a player everywhere the league records them.
 *
 * Players in this league rename their Minecraft accounts, and the archive
 * stores whatever name they were using at the time rather than an id - so one
 * player's career is held together by their name matching across six tables.
 * Change it in one and the rest stop being theirs: the season lines detach
 * from the game lines, the roster entry points at nobody, and the profile row
 * that maps a name to a Minecraft account stops matching, which drops their
 * head back to the blank grey block.
 *
 * So the rename is all six or none. Everything is checked before anything is
 * written, and the counts that come back say what moved.
 */

/** The tables that key a player by name, and the column that holds it. */
const NAMED = [
  { label: "seasonLines", table: historicalPlayerStats, column: historicalPlayerStats.playerName },
  { label: "gameLines", table: historicalGameStats, column: historicalGameStats.playerName },
  { label: "rosterEntries", table: historicalRosterEntries, column: historicalRosterEntries.playerName },
] as const;

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as RenamePayload;

    const from = payload.from?.trim();
    const to = payload.to?.trim();
    if (!from || !to) {
      return Response.json({ error: "Both the old and the new name are required." }, { status: 400 });
    }
    if (from === to) {
      return Response.json({ error: "That is already their name." }, { status: 400 });
    }
    // Minecraft allows letters, digits and underscore, 3-16 characters. A name
    // outside that cannot be a real account, and would resolve to no skin.
    if (!/^\w{3,16}$/.test(to)) {
      return Response.json(
        { error: "A Minecraft name is 3-16 characters, letters, digits and underscores only." },
        { status: 400 },
      );
    }

    const db = getDb();

    // Anything at all under the old name? A typo would otherwise report a
    // cheerful success having changed nothing.
    const [livePlayer] = await db.select().from(players).where(eq(players.displayName, from));
    const [profile] = await db
      .select()
      .from(minecraftProfiles)
      .where(eq(minecraftProfiles.playerName, from));
    const counts: Record<string, number> = {};
    for (const { label, table, column } of NAMED) {
      const rows = await db.select({ name: column }).from(table).where(eq(column, from));
      counts[label] = rows.length;
    }
    const total =
      Object.values(counts).reduce((sum, n) => sum + n, 0) +
      (livePlayer ? 1 : 0) +
      (profile ? 1 : 0);
    if (total === 0) {
      return Response.json({ error: `Nobody on the site is called ${from}.` }, { status: 404 });
    }

    // And nothing already under the new one. Renaming onto an existing player
    // would silently merge two careers into one, which no later edit can undo
    // because nothing records which rows came from where.
    const [takenPlayer] = await db.select().from(players).where(eq(players.displayName, to));
    const [takenProfile] = await db
      .select()
      .from(minecraftProfiles)
      .where(eq(minecraftProfiles.playerName, to));
    let takenElsewhere = 0;
    for (const { table, column } of NAMED) {
      const rows = await db.select({ name: column }).from(table).where(eq(column, to));
      takenElsewhere += rows.length;
    }
    if (takenPlayer || takenProfile || takenElsewhere > 0) {
      return Response.json(
        {
          error: `${to} already exists on the site. Renaming onto them would merge the two careers.`,
        },
        { status: 409 },
      );
    }

    for (const { table, column } of NAMED) {
      await db.update(table).set({ playerName: to }).where(eq(column, from));
    }
    if (livePlayer) {
      // The Minecraft username travels with the display name. They are the
      // same string for every player in this league, and letting them drift
      // apart is what a rename is supposed to prevent.
      await db
        .update(players)
        .set({ displayName: to, minecraftUsername: to })
        .where(eq(players.id, livePlayer.id));
    }
    if (profile) {
      // The account is the same account - same UUID - under a new name, so the
      // mapping is moved rather than looked up again. Their head keeps working
      // without waiting on the resolver script.
      await db
        .update(minecraftProfiles)
        .set({ playerName: to, currentName: to })
        .where(eq(minecraftProfiles.playerName, from));
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.rename",
      entityType: "player",
      entityId: livePlayer?.id ?? 0,
      detail: { from, to, ...counts, livePlayer: Boolean(livePlayer), profile: Boolean(profile) },
    });

    return Response.json({
      ok: true,
      from,
      to,
      ...counts,
      livePlayer: Boolean(livePlayer),
      profile: Boolean(profile),
      keptHead: Boolean(profile),
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("UNIQUE constraint")) {
      return Response.json({ error: "That name is already taken." }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
