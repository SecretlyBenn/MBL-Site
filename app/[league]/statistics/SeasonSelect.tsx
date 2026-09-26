"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SeasonSelect({ seasons, selected, career = false }: { seasons: { id: number; name: string }[]; selected: string; career?: boolean }) {
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
        {career && <option value="career">Career</option>}
        {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
      </select>
    </label>
  );
}
