import Link from "next/link";

const GROUPS = [
  {
    label: "League",
    links: [
      { href: "/standings", label: "Standings" },
      { href: "/schedule", label: "Schedule & Scores" },
      { href: "/seasons", label: "Season Archive" },
    ],
  },
  {
    label: "Statistics",
    links: [
      { href: "/careers", label: "Career Leaders" },
      { href: "/players", label: "Player Search" },
    ],
  },
];

export function SiteNav() {
  return (
    <header className="border-b border-white/10 bg-neutral-950 text-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4" aria-label="Main navigation">
        <Link href="/" className="mr-auto text-lg font-black tracking-tight">
          MBL
        </Link>
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          Home
        </Link>
        {GROUPS.map((group) => (
          <details key={group.label} className="group relative">
            <summary className="cursor-pointer list-none text-sm text-white/70 hover:text-white [&::-webkit-details-marker]:hidden">
              {group.label} <span aria-hidden="true" className="ml-1 text-[10px]">▼</span>
            </summary>
            <div className="absolute right-0 z-30 mt-3 min-w-52 overflow-hidden rounded-lg border border-white/10 bg-neutral-900 p-1 shadow-2xl">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        ))}
      </nav>
    </header>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
      {children}
    </p>
  );
}
