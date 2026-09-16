import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles, getArticlesByAuthor } from "@/db/news";
import { requireRole } from "@/app/roles";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { NewArticleForm } from "./NewArticleForm";

export const metadata: Metadata = { title: "Newsroom", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where the league's writers work.
 *
 * A WRITER sees their own pieces; an ADMIN sees everyone's, because someone
 * has to be able to take a piece down or finish one when its author is away.
 */
export default async function NewsroomPage() {
  const user = await requireRole(["ADMIN", "WRITER"], "/newsroom");
  const articles = user.role === "ADMIN" ? await getAllArticles() : await getArticlesByAuthor(user.id);
  const drafts = articles.filter((article) => article.status !== "PUBLISHED");
  const published = articles.filter((article) => article.status === "PUBLISHED");

  const list = (rows: typeof articles) => (
    <ul className="flex flex-col gap-2">
      {rows.map((article) => (
        <li key={article.id}>
          <Link
            href={`/newsroom/${article.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 transition-colors hover:border-sky-500/50 hover:bg-slate-800/40"
          >
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-100">{article.title}</span>
            <span className="text-xs text-slate-500">{article.authorName}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                article.status === "PUBLISHED"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {article.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <PageShell title="Newsroom" subtitle={`${user.displayName} · ${user.role.toLowerCase()}`}>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section>
            <SectionHeader title="Drafts" meta={`${drafts.length}`} />
            {drafts.length === 0 ? <EmptyState>Nothing in progress.</EmptyState> : list(drafts)}
          </section>
          <section>
            <SectionHeader title="Published" meta={`${published.length}`} />
            {published.length === 0 ? (
              <EmptyState>Nothing published yet.</EmptyState>
            ) : (
              list(published)
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-4">
          <NewArticleForm />
          <div className="ui-card p-4 text-xs leading-relaxed text-slate-400">
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-200">
              Writing an article
            </p>
            <p>
              Write the way you would in a document. Put the cursor in a line and press Heading,
              Quote or List; select words and press B, I or Link. Pictures are uploaded beside the
              article and added wherever the cursor is. Nothing is public until you press Publish.
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
