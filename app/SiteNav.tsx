import Link from "next/link";

const GROUPS = [
  {
    label: "League",
    links: [
      { href: "/standings", label: "Standings" },
      { href: "/schedule", label: "Schedule & Scores" },
      { href: "/rosters", label: "Rosters" },
      { href: "/seasons", label: "Seasons" },
    ],
  },
  {
    label: "Statistics",
    links: [
      { href: "/statistics/batting", label: "Batting Statistics" },
      { href: "/statistics/pitching", label: "Pitching Statistics" },
      { href: "/statistics/team-batting", label: "Team Batting Statistics" },
      { href: "/statistics/team-pitching", label: "Team Pitching Statistics" },
      { href: "/statistics/leaders", label: "Leaders" },
    ],
  },
  {
    // Each portal is role-gated server-side; signed-out visitors who click
    // through are redirected to sign in, so it's safe to always show them.
    label: "Portals",
    links: [
      { href: "/umpire", label: "Umpire — Submit Scorecard" },
      { href: "/head-umpire", label: "Head Umpire — Review" },
      { href: "/gm", label: "General Manager — Roster" },
      { href: "/admin", label: "League Admin" },
    ],
  },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 text-slate-100 backdrop-blur">
      <nav
        className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-2 gap-y-3 px-6 py-3"
        aria-label="Main navigation"
      >
        <Link href="/" className="mr-6 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mbl-logo.png" alt="" className="h-9 w-auto" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tight">MBL</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-slate-500">
              Baseball League
            </span>
          </span>
        </Link>
        <Link
          href="/"
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
        >
          Home
        </Link>
        {GROUPS.map((group) => (
          <div key={group.label} className="group relative">
            <span className="flex cursor-default items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors group-hover:bg-slate-800/70 group-hover:text-white">
              {group.label}
              <span aria-hidden="true" className="text-[9px] text-slate-500">
                ▼
              </span>
            </span>
            <div className="invisible absolute left-0 z-30 min-w-56 translate-y-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-1 opacity-0 shadow-2xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </header>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteNav />
      <main className={`mx-auto px-6 py-5 ${wide ? "max-w-[1600px]" : "max-w-5xl"}`}>
        {/* The heading and its subtitle sit on one line so the content below
            starts near the top of the viewport rather than a third down it. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-800/80 pb-2.5">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}
