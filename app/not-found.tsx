import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "./SiteNav";
import { SITE } from "./site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const DESTINATIONS = [
  { href: "/schedule", label: "Schedule & Scores", detail: "Every game and result" },
  { href: "/standings", label: "Standings", detail: "Where every club sits" },
  { href: "/statistics/leaders", label: "Leaders", detail: "The best of the season" },
  { href: "/rosters", label: "Rosters", detail: "Who plays where" },
];

/**
 * Shown for any address the site does not have, and for a game, player, team or
 * season id that does not exist - those pages call notFound() rather than
 * rendering an empty shell.
 */
export default function NotFound() {
  return (
    <PageShell
      header={
        <div className="border-b border-slate-800/80 pb-6 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">Error 404</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">That one went foul.</h1>
          <p className="mt-3 max-w-xl text-slate-400">
            The page you were looking for isn&apos;t here. It may have moved, or the link may be
            mistyped. Here&apos;s where most people are headed:
          </p>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {DESTINATIONS.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 transition-colors hover:border-sky-500/40 hover:bg-slate-900"
          >
            <span className="block font-semibold text-slate-100">{destination.label}</span>
            <span className="block text-sm text-slate-500">{destination.detail}</span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Think something&apos;s broken?{" "}
        <a href={SITE.discordUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300">
          Let us know on Discord
        </a>
        .
      </p>
    </PageShell>
  );
}
