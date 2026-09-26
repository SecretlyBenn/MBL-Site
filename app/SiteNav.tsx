import Link from "next/link";
import { MobileActionBar } from "./MobileActionBar";
import { LeagueBrand, NavLinks } from "./NavLinks";
import { SignInButton } from "./SignInButton";
import { SiteFooter } from "./SiteFooter";

const GROUPS = [
  {
    label: "League",
    links: [
      { href: "standings", label: "Standings" },
      { href: "schedule", label: "Schedule & Scores" },
      { href: "rosters", label: "Rosters" },
      { href: "seasons", label: "Seasons" },
      { href: "news", label: "News" },
      { href: "rules", label: "Rules" },
    ],
  },
  {
    label: "Statistics",
    links: [
      { href: "statistics/batting", label: "Batting Statistics" },
      { href: "statistics/pitching", label: "Pitching Statistics" },
      { href: "statistics/team-batting", label: "Team Batting Statistics" },
      { href: "statistics/team-pitching", label: "Team Pitching Statistics" },
      { href: "statistics/leaders", label: "Leaders" },
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
        <LeagueBrand />

        {/* The full bar needs room and a pointer that can hover, so it waits for
            large screens; everything narrower gets MobileMenu. Both are drawn
            by NavLinks, which prefixes them with the league being read. */}
        <NavLinks groups={GROUPS} />
        {/* Rendered once, where both layouts can use it - it reads the session
            and the league user, and a second copy would do that twice. */}
        <div className="flex items-center">
          <SignInButton />
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
