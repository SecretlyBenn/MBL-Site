import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getComments, getLikes } from "@/db/news";
import { getLeagueUser } from "@/app/roles";
import { getSession } from "@/app/session";
import { PageShell } from "@/app/SiteNav";
import { Article } from "../render";
import { Reactions } from "./Reactions";
import { leagueFrom } from "../../league";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string; slug: string }>;
}): Promise<Metadata> {
  const { league, slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "PUBLISHED") {
    return { title: "Article not found", robots: { index: false } };
  }
  return {
    title: article.title,
    description: article.summary || `${article.title} - Minecraft Baseball League news.`,
    alternates: { canonical: `/${league}/news/${article.slug}` },
    openGraph: article.coverImageId
      ? { images: [{ url: `/api/news/image/${article.coverImageId}` }] }
      : undefined,
  };
}

function published(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function ArticlePage({ params }: { params: Promise<{ league: string; slug: string }> }) {
  const league = await leagueFrom(params);
  const article = await getArticleBySlug((await params).slug);
  if (!article) notFound();

  const session = await getSession();
  const leagueUser = await getLeagueUser();
  // A draft is visible to whoever is writing it, and to an admin, so a piece
  // can be read in place before it goes out. To everyone else it is not there.
  const mine = leagueUser && (leagueUser.role === "ADMIN" || leagueUser.id === article.authorUserId);
  if (article.status !== "PUBLISHED" && !mine) notFound();

  const [comments, likes] = await Promise.all([
    getComments(article.id),
    getLikes(article.id, session?.discordId),
  ]);

  return (
    <PageShell header={<span className="sr-only">{article.title}</span>}>
      <article className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-slate-400">
          <Link href={`/${league.slug}/news`} className="hover:text-white">
            ← All news
          </Link>
        </p>

        {article.status !== "PUBLISHED" && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            This is a draft. Only you and the league admins can see it.
          </p>
        )}

        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
        {article.summary && <p className="mt-2 text-lg text-slate-400">{article.summary}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
          <span className="font-semibold text-slate-300">{article.authorName}</span>
          <span>{published(article.publishedAt)}</span>
        </p>

        {article.coverImageId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/news/image/${article.coverImageId}`}
            alt=""
            // A cover is a banner: a tall phone photo is cropped to the frame
            // rather than pushing the article below the fold.
            className="mt-5 aspect-video w-full rounded-xl border border-slate-800 object-cover"
          />
        )}

        <div className="mt-6">
          <Article body={article.body} />
        </div>

        {mine && (
          <p className="mt-6 text-sm">
            <Link href={`/newsroom/${article.id}`} className="ui-link font-semibold">
              Edit this article →
            </Link>
          </p>
        )}

        {article.status === "PUBLISHED" && (
          <Reactions
            articleId={article.id}
            likes={likes}
            comments={comments}
            signedIn={Boolean(session)}
            me={session?.discordId ?? null}
            isAdmin={leagueUser?.role === "ADMIN"}
          />
        )}
      </article>
    </PageShell>
  );
}
