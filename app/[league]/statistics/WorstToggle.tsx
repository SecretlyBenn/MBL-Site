"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reads the boards from the other end.
 *
 * Only the rate boards have another end worth reading - the ones that already
 * need a qualifying minimum - so turning this on hides the counting boards
 * rather than reversing them. The fewest home runs in a season is not a
 * record, it is whoever turned up once.
 *
 * A link rather than state, so the view is in the address and can be sent to
 * somebody. It keeps whatever season is open.
 */
export function WorstToggle({ worst }: { worst: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (next: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("worst", "1");
    else params.delete("worst");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const style = (on: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
      on ? "bg-sky-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="flex items-end gap-1">
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-1">
        <button type="button" onClick={() => go(false)} className={style(!worst)} aria-pressed={!worst}>
          Best
        </button>
        <button type="button" onClick={() => go(true)} className={style(worst)} aria-pressed={worst}>
          Worst
        </button>
      </div>
    </div>
  );
}
