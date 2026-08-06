import Link from "next/link";
import { getHistoricalSeasons } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const seasons = await getHistoricalSeasons();

  return (
    <PageShell title="Seasons" subtitle="Every season in league history.">
      {seasons.length === 0 ? (
        <EmptyState>No seasons have been recorded yet.</EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {seasons.map((season) => (
            <li key={season.id}>
              <Link
                href={`/seasons/${season.id}`}
                className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-900/40 px-4 py-3 hover:bg-slate-800/60"
              >
                <span className="font-medium">{season.name}</span>
                {season.isPlayoffs && (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs uppercase tracking-wide text-amber-300">
                    Playoffs
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
