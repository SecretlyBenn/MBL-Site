const LOGOS: Record<string, string> = {
  knights: "/team-logos/knights.png",
  panthers: "/team-logos/panthers.png",
  expos: "/team-logos/expos.png",
  otters: "/team-logos/otters.png",
  thunderbirds: "/team-logos/thunderbirds.png",
  grizzlies: "/team-logos/grizzlies.webp",
  jazz: "/team-logos/jazz.png",
  voodoo: "/team-logos/voodoo.png",
  blizzards: "/team-logos/blizzards.png",
  sunset: "/team-logos/sunset.png",
};

export function teamLogoPath(teamName: string) {
  const normalized = teamName.toLowerCase();
  return Object.entries(LOGOS).find(([nickname]) => normalized.includes(nickname))?.[1] ?? null;
}

export function TeamLogo({ teamName, className = "h-8 w-8" }: { teamName: string; className?: string }) {
  const src = teamLogoPath(teamName);
  return src ? <img src={src} alt={`${teamName} logo`} className={`${className} object-contain`} /> : null;
}
