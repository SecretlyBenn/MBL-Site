"use client";

import { logoKey, teamLogoPath } from "./logo-key";
import { useLogoOverrides } from "./LogoOverrides";

export { teamLogoPath };

/**
 * A club's logo. One uploaded through the admin page wins; otherwise the
 * built-in logo for the club's nickname; otherwise nothing.
 *
 * The list of built-in crests lives in `logo-key.ts` rather than here, because
 * the jumbotron's scoreboard resolves a logo on the server and cannot import a
 * client component to do it.
 */
export function TeamLogo({ teamName, className = "h-8 w-8" }: { teamName: string; className?: string }) {
  const overrides = useLogoOverrides();
  const src = overrides[logoKey(teamName)] ?? teamLogoPath(teamName);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={`${teamName} logo`} className={`${className} object-contain`} /> : null;
}
