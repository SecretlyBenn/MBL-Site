/**
 * What a visitor sees while a page's data loads.
 *
 * Every public page reads the database on each request, and without this the
 * browser simply sat on the old page after a click with no sign anything was
 * happening. The header is a static copy of SiteNav's shape rather than the real
 * thing: the real one reads the session, and a loading screen should not cost a
 * database read of its own.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" aria-busy="true">
      <div className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95">
        <div className="mx-auto flex h-[53px] max-w-[1600px] items-center gap-2.5 px-4 sm:px-6 lg:h-[61px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mbl-logo.png" alt="" width={36} height={36} className="h-9 w-auto" />
          <span className="text-lg font-black tracking-tight">MBL</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <p className="sr-only" role="status">
          Loading…
        </p>
        <div className="animate-pulse space-y-6">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="h-6 w-48 rounded bg-slate-800" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-20 rounded-lg bg-slate-900" />
            ))}
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div key={key} className="h-9 rounded bg-slate-900/70" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
