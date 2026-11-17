import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { draftPicks, drafts } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Starting a draft, and putting it back.
 *
 * Until an admin starts it nobody can pick, which is what keeps a board set up
 * a week early from being drafted out of the moment it exists. It is also
 * where the first pick's clock counts from, so starting it is the thing that
 * sets everybody running at the same moment rather than whenever the page was
 * made.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN"]);
    const { id } = (await request.json()) as { id: number };
    if (!Number.isInteger(id)) return Response.json({ error: "Which draft?" }, { status: 400 });

    const db = getDb();
    const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, id) });
    if (!draft) return Response.json({ error: "No such draft." }, { status: 404 });
    if (draft.startedAt) {
      return Response.json({ error: "That draft has already started." }, { status: 409 });
    }

    const startedAt = new Date().toISOString();
    // Sign-ups close as it starts. The pool a draft is run from should not be
    // moving underneath it, and the alternative is an admin remembering to
    // press two buttons in the right order on the night.
    await db.update(drafts).set({ startedAt, signupsOpen: false }).where(eq(drafts.id, id));

    await logAudit({
      actingUserId: user.id,
      action: "draft.start",
      entityType: "draft",
      entityId: id,
      detail: { name: draft.name, startedAt },
    });
    return Response.json({ ok: true, startedAt });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Un-starts a draft, for one started by accident.
 *
 * Refused once anybody has picked: the picks are what a draft is, and putting
 * the clock back to before them would say the draft has not begun while ten
 * players have already gone.
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN"]);
    const { id } = (await request.json()) as { id: number };
    if (!Number.isInteger(id)) return Response.json({ error: "Which draft?" }, { status: 400 });

    const db = getDb();
    const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, id) });
    if (!draft) return Response.json({ error: "No such draft." }, { status: 404 });

    const made = await db
      .select({ id: draftPicks.id })
      .from(draftPicks)
      .where(and(eq(draftPicks.draftId, id), isNotNull(draftPicks.playerId)))
      .limit(1);
    if (made.length > 0) {
      return Response.json(
        { error: "Picks have already been made. Take them back first." },
        { status: 409 },
      );
    }

    await db.update(drafts).set({ startedAt: null }).where(eq(drafts.id, id));
    await logAudit({
      actingUserId: user.id,
      action: "draft.unstart",
      entityType: "draft",
      entityId: id,
      detail: { name: draft.name },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
