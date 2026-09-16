import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimit } from "@/db/rate-limit";
import { newsArticles, newsComments } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { getLeagueUser } from "@/app/roles";
import { getSession } from "@/app/session";

/**
 * Comments under an article.
 *
 * Signing in with Discord is enough to comment - it is the same bar the rest
 * of the site uses, and it means a name stands behind every comment. A league
 * role is not required, because readers are not staff.
 *
 * A comment is hidden rather than deleted, so the thread keeps its shape and
 * whoever moderates can still see what was said. Its author can hide their
 * own; an admin can hide anyone's.
 */

const MAX_COMMENT = 2000;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in with Discord to comment." }, { status: 401 });

    const { articleId, body } = (await request.json()) as { articleId: number; body: string };
    const text = body?.trim();
    if (!text) return Response.json({ error: "Write something first." }, { status: 400 });
    if (text.length > MAX_COMMENT) {
      return Response.json({ error: "That comment is too long." }, { status: 400 });
    }

    // A handful a minute is a conversation; more than that is a machine.
    const verdict = await rateLimit(`comment:${session.discordId}`, { limit: 10, windowSeconds: 120 });
    if (!verdict.ok) {
      return Response.json(
        { error: "You are commenting very quickly. Wait a moment." },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfter) } },
      );
    }

    const db = getDb();
    const article = await db.query.newsArticles.findFirst({
      where: eq(newsArticles.id, Number(articleId)),
    });
    // A draft is not public, so it has no public comments.
    if (!article || article.status !== "PUBLISHED") {
      return Response.json({ error: "No such article." }, { status: 404 });
    }

    const [comment] = await db
      .insert(newsComments)
      .values({
        articleId: article.id,
        discordId: session.discordId,
        displayName: session.displayName,
        body: text,
      })
      .returning();

    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in with Discord." }, { status: 401 });

    const { id } = (await request.json()) as { id: number };
    if (!Number.isInteger(id)) return Response.json({ error: "Which comment?" }, { status: 400 });

    const db = getDb();
    const comment = await db.query.newsComments.findFirst({ where: eq(newsComments.id, id) });
    if (!comment) return Response.json({ error: "No such comment." }, { status: 404 });

    const leagueUser = await getLeagueUser();
    const mine = comment.discordId === session.discordId;
    if (!mine && leagueUser?.role !== "ADMIN") {
      return Response.json({ error: "That is not your comment." }, { status: 403 });
    }

    await db
      .update(newsComments)
      .set({ hiddenAt: new Date().toISOString() })
      .where(and(eq(newsComments.id, id)));

    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
