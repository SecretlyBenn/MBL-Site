"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * A dropdown that narrows an admin page through the URL - which season, which
 * team. The page loads only what is picked rather than everything at once, and
 * the choice survives a refresh or a shared link.
 */
export function QueryPicker({
  label,
  param,
  value,
  options,
}: {
  label: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="ui-field-label">
      {label}
      <select
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          next.set(param, event.target.value);
          router.push(`${pathname}?${next}`);
        }}
        className="ui-select min-w-64 normal-case tracking-normal"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
