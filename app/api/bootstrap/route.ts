import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { users } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

/**
 * One-time setup: if no users exist yet, whoever is currently signed in with
 * ChatGPT becomes the first ADMIN. Once any user row exists this always 409s -
 * further accounts must be created from the admin page. This only guards
 * against an empty table, not general access, so remove or further restrict
 * this route before a real public deployment.
 */
export async function POST() {
  try {
    const chatGPTUser = await getChatGPTUser();
    if (!chatGPTUser) {
      return Response.json({ error: "Sign in with ChatGPT first." }, { status: 401 });
    }

    const db = getDb();
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      return Response.json(
        { error: "Setup has already been completed." },
        { status: 409 },
      );
    }

    const [admin] = await db
      .insert(users)
      .values({
        email: chatGPTUser.email,
        displayName: chatGPTUser.displayName,
        role: "ADMIN",
      })
      .returning();

    await logAudit({
      actingUserId: admin.id,
      action: "user.bootstrap",
      entityType: "user",
      entityId: admin.id,
      detail: { email: admin.email },
    });

    return Response.json({ user: admin }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
