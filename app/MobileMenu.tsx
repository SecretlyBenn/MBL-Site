"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

type Group = { label: string; links: readonly { href: string; label: string }[] };

/**
 * Navigation for screens too narrow for the bar - phones and tablets.
 *
 * The desktop menus open on hover, and a touch screen has no hover: tapping
 * "League" did nothing dependable, so the only way around the site on a phone
 * was the buttons on the home page. This lists every link openly instead.
 *
 * It closes itself on navigation. The nav is re-rendered with each page rather
 * than living in a layout, so an open menu would otherwise survive the move
 * and sit over the page the visitor just asked for.
 */
export function MobileMenu({ groups }: { groups: readonly Group[] }) {
  const pathname = usePathname();
  // Remembers the page the menu was opened on rather than a plain flag, so it
  // is closed on any other page without an effect having to reset it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (href: string) =>
    `block rounded-md px-3 py-2.5 text-[15px] transition-colors ${
      pathname === href ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
    }`;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-800/70"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-slate-800 bg-slate-950/98 px-4 pb-6 pt-2 shadow-2xl backdrop-blur"
        >
          <Link href="/" className={linkClass("/")}>
            Home
          </Link>
          {groups.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {group.label}
              </p>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
