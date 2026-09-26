import Link from "next/link";

/**
 * Links to a player or a club, which live inside a league's part of the site.
 *
 * The league is passed in rather than guessed from the address: these render
 * inside server components, which cannot see the current path, and a link that
 * quietly assumed the wrong league would send a reader to another league's
 * player of the same name.
 */
export function PlayerProfileLink({
  leagueSlug,
  name,
  className = "",
}: {
  leagueSlug: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/${leagueSlug}/players/history/${encodeURIComponent(name)}`}
      className={`hover:text-white hover:underline ${className}`}
    >
      {name}
    </Link>
  );
}

export function HistoricalTeamLink({
  leagueSlug,
  name,
  seasonId,
  teamId,
  className = "",
}: {
  leagueSlug: string;
  name: string;
  seasonId: number;
  teamId: number;
  className?: string;
}) {
  return (
    <Link
      href={`/${leagueSlug}/rosters?season=${seasonId}&team=${teamId}`}
      className={`hover:text-white hover:underline ${className}`}
    >
      {name}
    </Link>
  );
}
