import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { newsArticles, newsImages } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { PageShell } from "@/app/SiteNav";
import { ArticleEditor } from "./ArticleEditor";

export const metadata: Metadata = { title: "Edit article", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const user = await requireRole(["ADMIN", "WRITER"], `/newsroom/${id}`);
  if (!Number.isInteger(id)) notFound();

  const db = getDb();
  const article = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
  if (!article) notFound();
  // A writer edits their own pieces. Someone else's is not found rather than
  // forbidden, so the newsroom does not confirm what others are drafting.
  if (user.role !== "ADMIN" && article.authorUserId !== user.id) notFound();

  // Only the ids: the pictures themselves are fetched by the browser, from
  // addresses it can cache, rather than carried through this page.
  const images = await db
    .select({ id: newsImages.id })
    .from(newsImages)
    .where(eq(newsImages.articleId, id));

  return (
    // Whether it is published is shown beside Save, where it changes the moment
    // it is published; a subtitle up here would go on saying "Draft".
    <PageShell wide title="Edit article" subtitle="Newsroom">
      <p className="mb-4 text-sm text-slate-400">
        <Link href="/newsroom" className="hover:text-white">
          ← Newsroom
        </Link>
      </p>
      <ArticleEditor
        // A copy saved since this page was last drawn starts the editor
        // afresh, rather than leaving an older copy on screen to be saved over
        // the newer one.
        key={article.updatedAt}
        article={{
          id: article.id,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          body: article.body,
          coverImageId: article.coverImageId,
          status: article.status as "DRAFT" | "PUBLISHED",
        }}
        imageIds={images.map((image) => image.id)}
      />
    </PageShell>
  );
}
