import Link from "next/link";
import { SITE } from "./site";

const COLUMNS = [
  {
    heading: "League",
    links: [
      { href: "/schedule", label: "Schedule & Scores" },
      { href: "/standings", label: "Standings" },
      { href: "/rosters", label: "Rosters" },
      { href: "/seasons", label: "Seasons" },
      { href: "/news", label: "News" },
    ],
  },
  {
    heading: "Statistics",
    links: [
      { href: "/statistics/batting", label: "Batting" },
      { href: "/statistics/pitching", label: "Pitching" },
      { href: "/statistics/leaders", label: "Leaders" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-800/80 bg-slate-950 text-slate-400">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mbl-logo.png" alt="" width={32} height={32} className="h-8 w-auto" />
            <span className="text-base font-black tracking-tight text-slate-100">{SITE.shortName}</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm">{SITE.description}</p>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-md bg-[#5865F2] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#4752c4]"
          >
            Join Discord
          </a>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{column.heading}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800/80">
        <p className="mx-auto max-w-[1600px] px-4 py-5 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} {SITE.name}. NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR
          ASSOCIATED WITH MOJANG OR MICROSOFT.
        </p>
      </div>
    </footer>
  );
}
