"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "./site";

const QUICK_LINKS = [
  { href: "/schedule", label: "Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/statistics/leaders", label: "Leaders" },
];

/** Staff tools have controls of their own along the bottom of the screen. */
const STAFF_PATH = /^\/(admin|umpire|head-umpire|gm|setup)(\/|$)/;

/**
 * The phone-only bar pinned to the bottom edge.
 *
 * On a phone the nav collapses behind a menu button, which puts the pages people
 * come for one tap further away and the Discord invite - the one thing the site
 * most wants a visitor to do - off the screen entirely. This keeps both in
 * thumb reach. Hidden from sm upward, where the full bar is visible anyway.
 */
export function MobileActionBar() {
  const pathname = usePathname();
  if (STAFF_PATH.test(pathname)) return null;

  return (
    <>
      {/* Holds space at the foot of the page so the bar never covers the footer. */}
      <div aria-hidden="true" className="h-16 sm:hidden" />
      <nav
        aria-label="Quick links"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden"
      >
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
            className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition-colors ${
              pathname === link.href ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <a
          href={SITE.discordUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-[1.3] rounded-md bg-[#5865F2] py-2 text-center text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#4752c4]"
        >
          Join Discord
        </a>
      </nav>
    </>
  );
}
