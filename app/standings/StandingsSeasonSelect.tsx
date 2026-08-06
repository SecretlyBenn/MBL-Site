"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function StandingsSeasonSelect({
  seasons,
  selected,
}: {
  seasons: { id: number; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="ui-field-label">
      Season
      <select
        value={selected}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("season", event.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
        className="ui-select"
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
    </label>
  );
}
