import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { MINECRAFT_NAME, linkProfile, linkedNames, lookupAccounts } from "@/db/minecraft";
import { PLAYER_STATUSES, players, teams } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Adds a batch of players at once - a draft class, or a new season's pool.
 *
 * Paste usernames one per line (commas work too). Names already in the pool
 * are skipped rather than failing the batch, so pasting the same list twice is
 * harmless. Each new player is linked to the Minecraft account using that name
 * right now, so their head shows immediately.
 */
export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as { usernames: string; teamId?: number | null; status?: string };

    // Minecraft names ignore case, so "Kexk" and "kexk" are one player - keep
    // the first spelling. Deduplicating exact strings let both through, and
    // the second insert failed the batch after the first had already landed.
    const seen = new Set<string>();
    const names = (payload.usernames ?? "")
      .split(/[\n,]+/)
      .map((name) => name.trim())
      .filter((name) => {
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (names.length === 0) {
      return Response.json({ error: "Paste at least one username." }, { status: 400 });
    }
    if (names.length > 100) {
      return Response.json({ error: "Add at most 100 players at a time." }, { status: 400 });
    }
    const invalid = names.filter((name) => !MINECRAFT_NAME.test(name));
    if (invalid.length > 0) {
      return Response.json(
        { error: `Not valid Minecraft usernames: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}` },
        { status: 400 },
      );
    }

    const db = getDb();
    const teamId = payload.teamId ? Number(payload.teamId) : null;
    const status = payload.status ?? (teamId ? "ACTIVE" : "FREE_AGENT");
    if (!(PLAYER_STATUSES as readonly string[]).includes(status)) {
      return Response.json({ error: "Unknown status." }, { status: 400 });
    }
    if (teamId && !(await db.query.teams.findFirst({ where: eq(teams.id, teamId) }))) {
      return Response.json({ error: "That team does not exist." }, { status: 404 });
    }
    if (teamId && (status === "FREE_AGENT" || status === "RELEASED")) {
      return Response.json({ error: "Players added to a team must be Active or Triple-A." }, { status: 400 });
    }
    if (!teamId && (status === "ACTIVE" || status === "TRIPLE_A")) {
      return Response.json({ error: "Pick a team for Active or Triple-A players." }, { status: 400 });
    }

    // Usernames are unique case-insensitively in practice, so compare that way.
    const lowered = names.map((name) => name.toLowerCase());
    const existing = await db
      .select({ name: players.minecraftUsername })
      .from(players)
      .where(inArray(sql`lower(${players.minecraftUsername})`, lowered));
    const taken = new Set(existing.map((row) => row.name.toLowerCase()));
    const fresh = names.filter((name) => !taken.has(name.toLowerCase()));

    const { found: accounts } = await lookupAccounts(fresh);
    const added: string[] = [];
    for (const typed of fresh) {
      // Mojang's capitalisation is the real one; use it when the account exists.
      const name = accounts.get(typed.toLowerCase())?.name ?? typed;
      await db.insert(players).values({ minecraftUsername: name, displayName: name, teamId, status });
      added.push(name);
    }

    const alreadyLinked = await linkedNames(added);
    let linked = 0;
    for (const name of added) {
      const account = accounts.get(name.toLowerCase());
      if (account && !alreadyLinked.has(name)) {
        await linkProfile(name, account, "mojang");
        linked += 1;
      }
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.bulk_create",
      entityType: "player",
      entityId: 0,
      detail: { added, skipped: names.length - fresh.length, teamId, status, linked },
    });

    return Response.json({
      added,
      skipped: names.filter((name) => taken.has(name.toLowerCase())),
      unlinked: added.filter((name) => !accounts.has(name.toLowerCase())),
    });
  } catch (error) {
    return apiError(error);
  }
}
