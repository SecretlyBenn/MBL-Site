"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/accounts", label: "Accounts" },
];

/** The admin sections, one page each, so no single page has to load everything. */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="-mx-1 mb-5 flex flex-wrap gap-1 border-b border-slate-800/80 pb-2">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-sky-600/20 text-sky-300" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
