import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/db/news";
import { getLeagueUser, hasRole } from "@/app/roles";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { leagueFrom } from "../league";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "News",
    description:
      "Minecraft Baseball League news: series previews, trades, awards and coverage written by the league.",
    alternates: { canonical: `/${league}/news` },
  };
}

export const dynamic = "force-dynamic";

/** "Monday June 15, 2026" from a stored timestamp. */
function published(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function NewsPage({ params }: { params: Promise<{ league: string }> }) {
  const league = await leagueFrom(params);
  const [articles, leagueUser] = await Promise.all([getPublishedArticles(league.id), getLeagueUser()]);
  const writes = hasRole(leagueUser, "ADMIN") || hasRole(leagueUser, "WRITER");

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
              href={`/${league.slug}/news/${article.slug}`}
              // Every piece gets the same card. The newest used to be laid
              // out as a lead, twice the size of the rest, which made the list
              // read as though the older ones mattered less and left each
              // article changing shape as soon as another was published.
              className="group flex flex-row gap-4 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-sky-500/50 hover:bg-slate-800/40"
            >
              {article.coverImageId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/news/image/${article.coverImageId}`}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  // One frame, the cover's own shape, so a cover cut to it
                  // fills it exactly. Contained rather than cropped so that an
                  // older cover made before the cropper existed is still shown
                  // whole instead of having its edges cut off.
                  className="aspect-video h-20 w-auto shrink-0 bg-slate-950 object-contain sm:h-28"
                />
              )}
              <div className="flex min-w-0 flex-col justify-center gap-1.5 p-4">
                <h2 className="text-lg font-black tracking-tight text-slate-100 group-hover:text-white">
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
