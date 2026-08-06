const LOGOS: Record<string, string> = {
  "saber tooth": "/team-logos/saber-tooths.png",
  sabertooth: "/team-logos/saber-tooths.png",
  "blue parrot": "/team-logos/parrots.png",
  hurricanes: "/team-logos/hurricanes.webp",
  gothams: "/team-logos/gothams.webp",
  piranhas: "/team-logos/piranhas.png",
  beacons: "/team-logos/beacons.png",
  wildcats: "/team-logos/wildcats.png",
  pistons: "/team-logos/pistons.png",
  aces: "/team-logos/aces.png",
  wolves: "/team-logos/wolves.png",
  boom: "/team-logos/boom.png",
  surf: "/team-logos/surf.png",
  penguins: "/team-logos/penguins.png",
  villagers: "/team-logos/villagers.png",
  nimbis: "/team-logos/nimbis.png",
  parrots: "/team-logos/parrots.png",
  alpacas: "/team-logos/alpacas.png",
  evokers: "/team-logos/evokers.png",
  crusaders: "/team-logos/crusaders.png",
  embers: "/team-logos/embers.png",
  flamingos: "/team-logos/flamingos.png",
  flamingo: "/team-logos/flamingos.png",
  aviators: "/team-logos/aviators.png",
  dolphins: "/team-logos/dolphins.png",
  platypi: "/team-logos/platypi.png",
  riptide: "/team-logos/riptide.png",
  mafia: "/team-logos/mafia.png",
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
