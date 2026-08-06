import Link from "next/link";

export function PlayerProfileLink({ name, className = "" }: { name: string; className?: string }) {
  return (
    <Link
      href={`/players/history/${encodeURIComponent(name)}`}
      className={`hover:text-white hover:underline ${className}`}
    >
      {name}
    </Link>
  );
}

export function HistoricalTeamLink({
  name,
  seasonId,
  teamId,
  className = "",
}: {
  name: string;
  seasonId: number;
  teamId: number;
  className?: string;
}) {
  return (
    <Link
      href={`/rosters?season=${seasonId}&team=${teamId}`}
      className={`hover:text-white hover:underline ${className}`}
    >
      {name}
    </Link>
  );
}
