import { logAudit } from "@/db/audit";
import { MINECRAFT_NAME, linkProfile, lookupAccounts } from "@/db/minecraft";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Links a name on the site to the Minecraft account a player uses today.
 *
 * `playerName` is the name as the site shows it - often an old archived name.
 * `minecraftName` is what the player is called in-game now. Mojang turns the
 * current name into the account's permanent id, and from then on the head
 * follows that account through any future rename or skin change.
 *
 * This is the fix for a player showing a blank head, or someone else's: the
 * archive holds names, and a name that has since been given up can belong to
 * a stranger.
 */
export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as { playerName: string; minecraftName: string };

    const playerName = payload.playerName?.trim();
    const minecraftName = payload.minecraftName?.trim();
    if (!playerName) return Response.json({ error: "Which player?" }, { status: 400 });
    if (!minecraftName || !MINECRAFT_NAME.test(minecraftName)) {
      return Response.json({ error: "Enter the player's current Minecraft username." }, { status: 400 });
    }

    const account = (await lookupAccounts([minecraftName])).get(minecraftName.toLowerCase());
    if (!account) {
      return Response.json(
        { error: `No Minecraft account is using the name "${minecraftName}" right now.` },
        { status: 404 },
      );
    }

    await linkProfile(playerName, account, "user");
    await logAudit({
      actingUserId: leagueUser.id,
      action: "player.link_account",
      entityType: "player",
      entityId: 0,
      detail: { playerName, minecraftName: account.name, uuid: account.uuid },
    });

    return Response.json({ ok: true, account });
  } catch (error) {
    return apiError(error);
  }
}
