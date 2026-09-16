import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { users } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Signs an account out of every browser it is signed in on.
 *
 * A session is a signed cookie, not a row, so it cannot simply be deleted -
 * instead the account's session epoch moves on and every cookie issued under
 * the old one stops being accepted. This is what to reach for when someone's
 * Discord account is stolen, when a laptop goes missing, or when a role is
 * taken away and the person should not keep working from a tab they left open.
 *
 * Removing the account entirely already ends its access; this is for when the
 * account should stay.
 */
export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const { userId } = (await request.json()) as { userId: number };
    if (!Number.isInteger(userId)) {
      return Response.json({ error: "Which account?" }, { status: 400 });
    }

    const db = getDb();
    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) return Response.json({ error: "No such account." }, { status: 404 });

    await db
      .update(users)
      .set({ sessionEpoch: sql`${users.sessionEpoch} + 1` })
      .where(eq(users.id, userId));

    await logAudit({
      actingUserId: leagueUser.id,
      action: "user.sign_out_everywhere",
      entityType: "user",
      entityId: userId,
      detail: { displayName: target.displayName, self: target.id === leagueUser.id },
    });

    // Signing yourself out ends the session this request was made with, so the
    // page that called this should send the person back to sign in.
    return Response.json({ ok: true, self: target.id === leagueUser.id });
  } catch (error) {
    return apiError(error);
  }
}
