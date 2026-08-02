import Link from "next/link";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { searchHistoricalPlayers } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const result = await searchHistoricalPlayers(query, requestedPage, 20);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const page = Math.min(requestedPage, pages);
  const href = (nextPage: number) => `/players?q=${encodeURIComponent(query)}&page=${nextPage}`;

  return (
    <PageShell title="Player Search" subtitle="Find a Minecraft username across every archived season.">
      <form className="mb-6 flex max-w-xl gap-2" action="/players">
        <label className="sr-only" htmlFor="player-search">Player username</label>
        <input id="player-search" name="q" type="search" defaultValue={query} placeholder="Search player username…" className="min-w-0 flex-1 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:border-white/40" />
        <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-neutral-950" type="submit">Search</button>
      </form>
      {result.rows.length === 0 ? <EmptyState>No player usernames matched your search.</EmptyState> : <>
        <div className="overflow-hidden rounded border border-white/10">
          {result.rows.map((player) => <Link key={player.playerName} href={`/players/history/${encodeURIComponent(player.playerName)}`} className="flex items-center justify-between border-b border-white/5 px-4 py-3 hover:bg-white/5"><span className="font-medium">{player.playerName}</span><span className="text-xs text-white/40">{player.seasons} season{Number(player.seasons) === 1 ? "" : "s"}</span></Link>)}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm"><span className="text-white/40">{result.total} players · Page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <Link className="rounded border border-white/15 px-3 py-1.5" href={href(page - 1)}>Previous</Link>}{page < pages && <Link className="rounded border border-white/15 px-3 py-1.5" href={href(page + 1)}>Next</Link>}</div></div>
      </>}
    </PageShell>
  );
}
