"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { id: number; name: string };

export function RosterSelect({
  label,
  param,
  options,
  selected,
  resetParam,
}: {
  label: string;
  param: string;
  options: Option[];
  selected: string;
  /** Cleared when this select changes, e.g. team when the season changes. */
  resetParam?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="ui-field-label">
      {label}
      <select
        value={selected}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set(param, event.target.value);
          if (resetParam) params.delete(resetParam);
          router.push(`${pathname}?${params.toString()}`);
        }}
        className="ui-select"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
