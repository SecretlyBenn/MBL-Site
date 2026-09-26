"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenu } from "./MobileMenu";
import { useCurrentLeague, useLeagues } from "./Leagues";

/**
 * The navigation's links, which depend on which league is open.
 *
 * A link written without a leading slash belongs to a league and is prefixed
 * with the one being read; one written with a slash is the same page whichever
 * league you came from - the staff portals and the policies.
 */
export type NavGroup = { label: string; links: { href: string; label: string }[] };

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const league = useCurrentLeague();
  const slug = league?.slug ?? "mbl";
  const within = (href: string) => (href.startsWith("/") ? href : `/${slug}/${href}`);
  const resolved = groups.map((group) => ({
    ...group,
    links: group.links.map((link) => ({ ...link, href: within(link.href) })),
  }));

  return (
    <>
      <div className="hidden items-center gap-x-2 lg:flex">
        <Link
          href={`/${slug}`}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
        >
          Home
        </Link>
        {resolved.map((group) => (
          <div key={group.label} className="group relative">
            {/* A button rather than a span so the menu can be reached with the
                keyboard: focusing it opens the menu through focus-within. */}
            <button
              type="button"
              aria-haspopup="true"
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors group-focus-within:bg-slate-800/70 group-focus-within:text-white group-hover:bg-slate-800/70 group-hover:text-white"
            >
              {group.label}
              <span aria-hidden="true" className="text-[9px] text-slate-500">
                ▼
              </span>
            </button>
            <div className="invisible absolute left-0 z-30 min-w-56 translate-y-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-1 opacity-0 shadow-2xl transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white focus:outline-none"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <LeagueSwitch />
        <MobileMenu groups={resolved} />
      </div>
    </>
  );
}

/**
 * Moves between the leagues the site holds.
 *
 * It keeps you on the same kind of page where that means anything - the
 * standings of one league are the standings of the other - but a page about
 * one game or one player has no counterpart, so those go to the league's
 * front page rather than to a number that means something else there.
 */
export function LeagueSwitch() {
  const leagues = useLeagues();
  const current = useCurrentLeague();
  const pathname = usePathname();

  if (leagues.length < 2 || !current) return null;

  const [, first, ...rest] = pathname.split("/");
  const inALeague = leagues.some((league) => league.slug === first);
  const aboutOneThing = rest.some((segment) => /\d/.test(segment));
  const tail = inALeague && !aboutOneThing ? rest.join("/") : "";

  return (
    <div className="flex shrink-0 items-center rounded-md border border-slate-800 p-0.5" role="group" aria-label="League">
      {leagues.map((league) => {
        const here = league.slug === current.slug;
        return (
          <Link
            key={league.slug}
            href={`/${league.slug}${tail ? `/${tail}` : ""}`}
            aria-current={here ? "page" : undefined}
            className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              here ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {league.abbreviation}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The wordmark, which names the league being read rather than the site.
 *
 * Both leagues still share the one mark: the MCBA has no logo on the site yet,
 * and a missing image would be worse than a shared one.
 */
export function LeagueBrand() {
  const league = useCurrentLeague();
  return (
    <Link href={`/${league?.slug ?? ""}`} className="mr-2 flex shrink-0 items-center gap-2.5 lg:mr-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mbl-logo.png" alt="" width={36} height={36} className="h-9 w-auto" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-black tracking-tight">{league?.abbreviation ?? "MBL"}</span>
        {/* Dropped on phones, where it would push the menu button off the bar. */}
        <span className="hidden text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600 sm:block">
          {league?.name ?? "Minecraft Baseball League"}
        </span>
      </span>
    </Link>
  );
}
