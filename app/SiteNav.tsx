import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { MobileActionBar } from "./MobileActionBar";
import { SignInButton } from "./SignInButton";
import { SiteFooter } from "./SiteFooter";

const GROUPS = [
  {
    label: "League",
    links: [
      { href: "/standings", label: "Standings" },
      { href: "/schedule", label: "Schedule & Scores" },
      { href: "/rosters", label: "Rosters" },
      { href: "/seasons", label: "Seasons" },
      { href: "/news", label: "News" },
      { href: "/rules", label: "Rules" },
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
      { href: "/newsroom", label: "Newsroom — Write Articles" },
      { href: "/admin", label: "League Admin" },
    ],
  },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 text-slate-100 backdrop-blur">
      <nav
        className="relative mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2 sm:px-6 lg:py-3"
        aria-label="Main navigation"
      >
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2.5 lg:mr-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mbl-logo.png" alt="" width={36} height={36} className="h-9 w-auto" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tight">MBL</span>
            {/* Dropped on phones, where it would push the menu button off the bar. */}
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600 sm:block">
              Minecraft Baseball League
            </span>
          </span>
        </Link>

        {/* The full bar needs room and a pointer that can hover, so it waits for
            large screens; everything narrower gets MobileMenu. */}
        <div className="hidden items-center gap-x-2 lg:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
          >
            Home
          </Link>
          {GROUPS.map((group) => (
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

        {/* Rendered once, where both layouts can use it - it reads the session
            and the league user, and a second copy would do that twice. */}
        <div className="ml-auto flex items-center gap-1">
          <SignInButton />
          <MobileMenu groups={GROUPS} />
        </div>
      </nav>
    </header>
  );
}

export function PageShell({
  title,
  subtitle,
  header,
  children,
  wide = false,
}: {
  title?: string;
  subtitle?: string;
  /**
   * Replaces the plain heading entirely. A page whose subject is a person or a
   * team leads with them - a portrait, a crest, a record - and repeating the
   * name as a heading above that only says it twice.
   */
  header?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteNav />
      <main className={`mx-auto px-4 py-5 sm:px-6 ${wide ? "max-w-[1600px]" : "max-w-5xl"}`}>
        {header ?? (
          // The heading and its subtitle sit on one line so the content below
          // starts near the top of the viewport rather than a third down it.
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-800/80 pb-2.5">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
        )}
        <div className="mt-4">{children}</div>
      </main>
      <SiteFooter />
      <MobileActionBar />
    </div>
  );
}

/**
 * The heading that opens a block of content.
 *
 * The home page set the pattern - a rule under a small upright label, with the
 * way to the full page on the right - and the pages behind it each invented
 * their own, so a leaderboard on the front page and the same leaderboard on
 * its own page did not look like the same site. One definition now, used by
 * both.
 */
export function SectionHeader({
  title,
  meta,
  action,
}: {
  title: string;
  /** A qualification that belongs with the title, like a count or a minimum. */
  meta?: React.ReactNode;
  /** Usually a link onward. */
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-800/80 pb-2">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h2>
        {meta && <p className="text-xs text-slate-500">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

/** A link onward, as it appears at the right of a SectionHeader. */
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
    >
      {children}
    </Link>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}
