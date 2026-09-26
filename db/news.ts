import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "./index";
import { newsArticles, newsComments, newsLikes } from "./schema";

/**
 * Reading the news page.
 *
 * Every query here is written for a page with 10ms of processor time: the list
 * counts likes and comments for the whole page in one grouped query each,
 * rather than asking per article.
 */

export type ArticleCard = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  authorName: string;
  publishedAt: string | null;
  coverImageId: number | null;
  likes: number;
  comments: number;
};

/** A web address for an article: lowercase words joined by hyphens. */
export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // A title of nothing but punctuation still needs an address.
  return base || `article-${Date.now().toString(36)}`;
}

/** Published articles, newest first, with their like and comment counts. */
export async function getPublishedArticles(leagueId: number, limit = 30): Promise<ArticleCard[]> {
  const db = getDb();
  const articles = await db
    .select({
      id: newsArticles.id,
      slug: newsArticles.slug,
      title: newsArticles.title,
      summary: newsArticles.summary,
      authorName: newsArticles.authorName,
      publishedAt: newsArticles.publishedAt,
      coverImageId: newsArticles.coverImageId,
    })
    .from(newsArticles)
    .where(and(eq(newsArticles.status, "PUBLISHED"), eq(newsArticles.leagueId, leagueId)))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);

  if (articles.length === 0) return [];
  const ids = articles.map((article) => article.id);
  const [likes, comments] = await Promise.all([
    db
      .select({ articleId: newsLikes.articleId, total: sql<number>`count(*)` })
      .from(newsLikes)
      .where(inArray(newsLikes.articleId, ids))
      .groupBy(newsLikes.articleId),
    db
      .select({ articleId: newsComments.articleId, total: sql<number>`count(*)` })
      .from(newsComments)
      .where(and(inArray(newsComments.articleId, ids), isNull(newsComments.hiddenAt)))
      .groupBy(newsComments.articleId),
  ]);
  const likesFor = new Map(likes.map((row) => [row.articleId, Number(row.total)]));
  const commentsFor = new Map(comments.map((row) => [row.articleId, Number(row.total)]));

  return articles.map((article) => ({
    ...article,
    likes: likesFor.get(article.id) ?? 0,
    comments: commentsFor.get(article.id) ?? 0,
  }));
}

/** One article by its address. Drafts come back too; the page decides who may see one. */
export async function getArticleBySlug(slug: string) {
  return getDb().query.newsArticles.findFirst({ where: eq(newsArticles.slug, slug) });
}

/** The comments under an article, oldest first, hidden ones left out. */
export async function getComments(articleId: number) {
  return getDb()
    .select({
      id: newsComments.id,
      discordId: newsComments.discordId,
      displayName: newsComments.displayName,
      body: newsComments.body,
      createdAt: newsComments.createdAt,
    })
    .from(newsComments)
    .where(and(eq(newsComments.articleId, articleId), isNull(newsComments.hiddenAt)))
    .orderBy(newsComments.createdAt);
}

/** How many have liked this article, and whether this reader is one of them. */
export async function getLikes(articleId: number, discordId?: string) {
  const db = getDb();
  const [[total], mine] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(newsLikes)
      .where(eq(newsLikes.articleId, articleId)),
    discordId
      ? db
          .select({ discordId: newsLikes.discordId })
          .from(newsLikes)
          .where(and(eq(newsLikes.articleId, articleId), eq(newsLikes.discordId, discordId)))
      : Promise.resolve([]),
  ]);
  return { total: Number(total?.total ?? 0), liked: mine.length > 0 };
}

/** Everything a writer has written, newest first, drafts included. */
export async function getArticlesByAuthor(userId: number) {
  return getDb()
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.authorUserId, userId))
    .orderBy(desc(newsArticles.updatedAt));
}

/** Every article, for an admin looking after the whole page. */
export async function getAllArticles() {
  return getDb().select().from(newsArticles).orderBy(desc(newsArticles.updatedAt));
}

/**
 * The newest few published articles, for the home page.
 *
 * One query and no like or comment counts: the home page is the busiest page
 * on the site, and a headline is all this column needs.
 */
export async function getRecentArticles(leagueId: number, limit = 4) {
  return getDb()
    .select({
      id: newsArticles.id,
      slug: newsArticles.slug,
      title: newsArticles.title,
      authorName: newsArticles.authorName,
      publishedAt: newsArticles.publishedAt,
      coverImageId: newsArticles.coverImageId,
    })
    .from(newsArticles)
    .where(and(eq(newsArticles.status, "PUBLISHED"), eq(newsArticles.leagueId, leagueId)))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);
}
