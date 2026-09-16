import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimit } from "@/db/rate-limit";
import { newsArticles, newsLikes } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { getSession } from "@/app/session";

/**
 * Liking an article, and taking a like back.
 *
 * One like per person per article, which is what the key on the table says -
 * so pressing the button twice leaves one like, then none.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in with Discord to like this." }, { status: 401 });

    const { articleId } = (await request.json()) as { articleId: number };
    const id = Number(articleId);
    if (!Number.isInteger(id)) return Response.json({ error: "Which article?" }, { status: 400 });

    const verdict = await rateLimit(`like:${session.discordId}`, { limit: 60, windowSeconds: 60 });
    if (!verdict.ok) {
      return Response.json({ error: "Slow down a moment." }, { status: 429 });
    }

    const db = getDb();
    const article = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
    if (!article || article.status !== "PUBLISHED") {
      return Response.json({ error: "No such article." }, { status: 404 });
    }

    const existing = await db
      .select({ discordId: newsLikes.discordId })
      .from(newsLikes)
      .where(and(eq(newsLikes.articleId, id), eq(newsLikes.discordId, session.discordId)));

    if (existing.length > 0) {
      await db
        .delete(newsLikes)
        .where(and(eq(newsLikes.articleId, id), eq(newsLikes.discordId, session.discordId)));
    } else {
      await db.insert(newsLikes).values({ articleId: id, discordId: session.discordId });
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(newsLikes)
      .where(eq(newsLikes.articleId, id));

    return Response.json({ liked: existing.length === 0, total: Number(total) });
  } catch (error) {
    return apiError(error);
  }
}
