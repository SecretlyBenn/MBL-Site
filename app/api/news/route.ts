import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { slugify } from "@/db/news";
import { newsArticles, newsComments, newsImages, newsLikes } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Writing, publishing and removing articles.
 *
 * A WRITER looks after their own articles; an ADMIN looks after every
 * article, because someone has to be able to take a piece down when its author
 * is not around.
 */

/** Whether this account may change this article. */
function mayEdit(article: { authorUserId: number | null }, user: { id: number; role: string }) {
  return user.role === "ADMIN" || article.authorUserId === user.id;
}

const MAX_TITLE = 140;
const MAX_SUMMARY = 300;
const MAX_BODY = 40000;

export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN", "WRITER"]);
    const payload = (await request.json()) as { title?: string };
    const title = payload.title?.trim();
    if (!title) return Response.json({ error: "Give the article a headline." }, { status: 400 });
    if (title.length > MAX_TITLE) {
      return Response.json({ error: "That headline is too long." }, { status: 400 });
    }

    const db = getDb();
    // Two articles can share a headline; they cannot share an address.
    let slug = slugify(title);
    if (await db.query.newsArticles.findFirst({ where: eq(newsArticles.slug, slug) })) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const [article] = await db
      .insert(newsArticles)
      .values({
        slug,
        title,
        authorUserId: user.id,
        authorName: user.displayName,
        status: "DRAFT",
      })
      .returning();

    await logAudit({
      actingUserId: user.id,
      action: "news.create",
      entityType: "news",
      entityId: article.id,
      detail: { title },
    });
    return Response.json({ article }, { status: 201 });
  } catch (error) {
    return apiError(error, "An article with that address already exists.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN", "WRITER"]);
    const payload = (await request.json()) as {
      id: number;
      title?: string;
      summary?: string;
      body?: string;
      coverImageId?: number | null;
      status?: "DRAFT" | "PUBLISHED";
    };
    if (!Number.isInteger(payload.id)) {
      return Response.json({ error: "Which article?" }, { status: 400 });
    }

    const db = getDb();
    const article = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, payload.id) });
    if (!article) return Response.json({ error: "No such article." }, { status: 404 });
    if (!mayEdit(article, user)) {
      return Response.json({ error: "That is not your article." }, { status: 403 });
    }

    const title = payload.title?.trim() ?? article.title;
    const summary = payload.summary?.trim() ?? article.summary;
    const body = payload.body ?? article.body;
    if (!title) return Response.json({ error: "Give the article a headline." }, { status: 400 });
    if (title.length > MAX_TITLE || summary.length > MAX_SUMMARY || body.length > MAX_BODY) {
      return Response.json({ error: "That is longer than an article can be." }, { status: 400 });
    }

    const status = payload.status ?? article.status;
    if (status !== "DRAFT" && status !== "PUBLISHED") {
      return Response.json({ error: "An article is either a draft or published." }, { status: 400 });
    }
    // Publishing an article for the first time dates it; publishing it again
    // after a correction keeps the date it first appeared.
    const publishedAt =
      status === "PUBLISHED" ? article.publishedAt ?? new Date().toISOString() : article.publishedAt;

    await db
      .update(newsArticles)
      .set({
        title,
        summary,
        body,
        coverImageId: payload.coverImageId === undefined ? article.coverImageId : payload.coverImageId,
        status,
        publishedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(newsArticles.id, article.id));

    if (status !== article.status) {
      await logAudit({
        actingUserId: user.id,
        action: status === "PUBLISHED" ? "news.publish" : "news.unpublish",
        entityType: "news",
        entityId: article.id,
        detail: { title },
      });
    }
    return Response.json({ ok: true, slug: article.slug, status });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN", "WRITER"]);
    const { id } = (await request.json()) as { id: number };
    if (!Number.isInteger(id)) return Response.json({ error: "Which article?" }, { status: 400 });

    const db = getDb();
    const article = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
    if (!article) return Response.json({ error: "No such article." }, { status: 404 });
    if (!mayEdit(article, user)) {
      return Response.json({ error: "That is not your article." }, { status: 403 });
    }

    // Comments, likes and pictures belong to the article; nothing of it is
    // left behind to point at a page that is gone.
    await db.delete(newsComments).where(eq(newsComments.articleId, id));
    await db.delete(newsLikes).where(eq(newsLikes.articleId, id));
    await db.delete(newsImages).where(eq(newsImages.articleId, id));
    await db.delete(newsArticles).where(eq(newsArticles.id, id));

    await logAudit({
      actingUserId: user.id,
      action: "news.delete",
      entityType: "news",
      entityId: id,
      detail: { title: article.title },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
