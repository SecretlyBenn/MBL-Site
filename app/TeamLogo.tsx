"use client";

import { logoKey } from "./logo-key";
import { useLogoOverrides } from "./LogoOverrides";

/** The logos that ship with the site, matched by the nickname in a club's name. */
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

  // The Collegiate Association's clubs, including the MiBL sides that play
  // inside it. A club is matched on its nickname, so "Coyotes (MIBL)"
  // finds the same crest as the Coyotes do.
  bandits: "/team-logos/bandits.png",
  batsmen: "/team-logos/batsmen.png",
  beavers: "/team-logos/beavers.png",
  cacti: "/team-logos/cacti.png",
  champions: "/team-logos/champions.png",
  coyotes: "/team-logos/coyotes.png",
  crocodiles: "/team-logos/crocodiles.png",
  ducks: "/team-logos/ducks.png",
  emeralds: "/team-logos/emeralds.png",
  fleeces: "/team-logos/fleeces.png",
  gators: "/team-logos/gators.png",
  gorillas: "/team-logos/gorillas.png",
  hitmen: "/team-logos/hitmen.png",
  huskies: "/team-logos/huskies.png",
  monkeys: "/team-logos/monkeys.png",
  oranges: "/team-logos/oranges.png",
  raiders: "/team-logos/raiders.png",
  samurai: "/team-logos/samurai.png",
  sandals: "/team-logos/sandals.png",
  sentinels: "/team-logos/sentinels.png",
  spiders: "/team-logos/spiders.png",
  toucans: "/team-logos/toucans.png",
  trojans: "/team-logos/trojans.png",
  tsunami: "/team-logos/tsunami.png",
  twisters: "/team-logos/twisters.png",
  vipers: "/team-logos/vipers.png",
};

export function teamLogoPath(teamName: string) {
  const normalized = teamName.toLowerCase();
  return Object.entries(LOGOS).find(([nickname]) => normalized.includes(nickname))?.[1] ?? null;
}

/**
 * A club's logo. One uploaded through the admin page wins; otherwise the
 * built-in logo for the club's nickname; otherwise nothing.
 */
export function TeamLogo({ teamName, className = "h-8 w-8" }: { teamName: string; className?: string }) {
  const overrides = useLogoOverrides();
  const src = overrides[logoKey(teamName)] ?? teamLogoPath(teamName);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={`${teamName} logo`} className={`${className} object-contain`} /> : null;
}
