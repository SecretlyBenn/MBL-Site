import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/db/news";
import { getLeagueUser } from "@/app/roles";
import { EmptyState, PageShell } from "@/app/SiteNav";

export const metadata: Metadata = {
  title: "News",
  description:
    "Minecraft Baseball League news: series previews, trades, awards and coverage written by the league.",
  alternates: { canonical: "/news" },
};

export const dynamic = "force-dynamic";

/** "Monday June 15, 2026" from a stored timestamp. */
function published(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function NewsPage() {
  const [articles, leagueUser] = await Promise.all([getPublishedArticles(), getLeagueUser()]);
  const writes = leagueUser?.role === "ADMIN" || leagueUser?.role === "WRITER";

  return (
    <PageShell title="News" subtitle="Written by the league.">
      {writes && (
        <p className="mb-4">
          <Link href="/newsroom" className="ui-link text-sm font-semibold">
            Open the newsroom →
          </Link>
        </p>
      )}

      {articles.length === 0 ? (
        <EmptyState>
          Nothing has been published yet.
          {writes ? " Write the first piece in the newsroom." : ""}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {articles.map((article, index) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              // The newest piece is the lead and gets the room; the rest run
              // beneath it as a column of headlines, the way a sports page
              // reads.
              className={`group flex gap-4 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-sky-500/50 hover:bg-slate-800/40 ${
                index === 0 ? "flex-col sm:flex-row" : "flex-row"
              }`}
            >
              {article.coverImageId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/news/image/${article.coverImageId}`}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  className={`shrink-0 object-cover ${
                    index === 0 ? "h-48 w-full sm:h-56 sm:w-96" : "hidden h-28 w-44 sm:block"
                  }`}
                />
              )}
              <div className="flex min-w-0 flex-col justify-center gap-1.5 p-4">
                <h2
                  className={`font-black tracking-tight text-slate-100 group-hover:text-white ${
                    index === 0 ? "text-2xl sm:text-3xl" : "text-lg"
                  }`}
                >
                  {article.title}
                </h2>
                {article.summary && (
                  <p className="line-clamp-2 text-sm text-slate-400">{article.summary}</p>
                )}
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">{article.authorName}</span>
                  <span>{published(article.publishedAt)}</span>
                  <span>{article.likes} {article.likes === 1 ? "like" : "likes"}</span>
                  <span>{article.comments} {article.comments === 1 ? "comment" : "comments"}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
