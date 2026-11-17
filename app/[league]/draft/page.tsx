import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { draftablePlayers, getBoard, onTheClock } from "@/db/draft";
import { getLogoOverrides } from "@/db/logos";
import { drafts } from "@/db/schema";
import { logoKey, teamLogoPath } from "@/app/logo-key";
import { getLeagueUser, hasRole } from "@/app/roles";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { PlayerHead } from "@/app/PlayerHead";
import { leagueFrom } from "../league";
import { Board, Crest } from "./Board";
import { PickButton } from "./PickButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Draft",
    description: "Every pick as it is made, and who is on the clock.",
    alternates: { canonical: `/${league}/draft` },
  };
}

export const dynamic = "force-dynamic";

/**
 * The draft board.
 *
 * Public, because a draft is a thing people watch. The club on the clock gets
 * the pool and a button, and only that club - whose turn it is is checked on
 * the route as well, so this decides what is worth drawing rather than who is
 * allowed to do it.
 *
 * The page does not refresh itself. Every viewer polling would be every viewer
 * costing a request a second between picks, which is the same arithmetic that
 * keeps the stadium scoreboards from polling, and a draft takes an evening.
 */
export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ draft?: string; find?: string }>;
}) {
  const league = await leagueFrom(params);
  const asked = await searchParams;
  const find = asked.find?.trim() ?? "";

  const db = getDb();
  // The competition's drafts, newest first. A league runs one at a time in
  // practice, so the newest is the one being watched; ?draft= reaches an older
  // one, which is how last winter's board stays readable.
  const held = await db
    .select({ id: drafts.id, name: drafts.name, rounds: drafts.rounds, mode: drafts.mode })
    .from(drafts)
    .where(eq(drafts.leagueId, league.id))
    .orderBy(desc(drafts.id));

  const wanted = Number(asked.draft);
  const draft = held.find((row) => row.id === wanted) ?? held[0];

  if (!draft) {
    return (
      <PageShell title="Draft" subtitle={league.name}>
        <EmptyState>No draft has been set up for this competition.</EmptyState>
      </PageShell>
    );
  }

  const [board, overrides, user] = await Promise.all([
    getBoard(draft.id),
    getLogoOverrides(),
    getLeagueUser(),
  ]);
  const clock = onTheClock(board);

  // One crest per club rather than one per pick. TeamLogo is a client
  // component and a board is two hundred rows; resolved here it is an ordinary
  // image in server-rendered markup, which is what the jumbotron does for the
  // same reason.
  const crests = new Map<number, string>();
  for (const pick of board) {
    if (crests.has(pick.teamId)) continue;
    const src = overrides[logoKey(pick.teamName)] ?? teamLogoPath(pick.teamName);
    if (src) crests.set(pick.teamId, src);
  }

  // An admin picks for anybody, which is what gets a draft past a GM who has
  // gone to bed. A GM picks when it is their club's turn.
  const mayPick =
    clock !== undefined &&
    user !== null &&
    (hasRole(user, "ADMIN") || (hasRole(user, "GM") && user.teamId === clock.teamId));

  const pool = mayPick ? await draftablePlayers(draft.id, league, find) : [];

  const made = board.filter((pick) => pick.playerId !== null);
  const last = made[made.length - 1];
  const done = board.length > 0 ? Math.round((made.length / board.length) * 100) : 0;
  const clockColour = clock?.teamColor ?? "#38bdf8";

  return (
    <PageShell
      title={draft.name}
      subtitle={`${league.name} · ${draft.mode === "SNAKE" ? "Snake" : "Straight"} · ${draft.rounds} rounds`}
    >
      <div className="flex flex-col gap-6">
        {/* Who everybody is waiting on. The biggest thing on the page,
            because on a draft night it is the only thing anybody has the page
            open for. */}
        <section
          style={{ borderColor: `${clockColour}66` }}
          className="overflow-hidden rounded-xl border bg-slate-900/70"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-4 sm:p-5">
            {clock ? (
              <>
                <Crest
                  src={crests.get(clock.teamId)}
                  name={clock.teamName}
                  className="h-12 w-12 sm:h-16 sm:w-16"
                />
                {/* Wide enough that the club's name is never the thing that
                    gives way: on a phone it was squeezed to "De…" by the
                    panel beside it, and the name is the one thing anybody
                    opens this page to read. */}
                <div className="min-w-[12rem] flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                    On the clock
                  </p>
                  <p
                    style={{ color: clockColour }}
                    className="text-2xl font-black leading-tight sm:text-3xl"
                  >
                    {clock.teamName}
                  </p>
                  <p className="text-sm font-semibold text-slate-400">
                    Round {clock.round} · pick {clock.overall} of {board.length}
                  </p>
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Finished
                </p>
                <p className="text-2xl font-black leading-tight text-emerald-300 sm:text-3xl">
                  Every pick has been made
                </p>
              </div>
            )}

            {/* The pick before this one, for anybody who has just opened the
                page and wants to know what they missed. */}
            {last && (
              <div className="w-full min-w-0 border-slate-800 sm:w-auto sm:border-l sm:pl-6">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Last pick
                </p>
                <p className="flex items-center gap-2 pt-1">
                  <PlayerHead name={last.playerName ?? ""} size={24} />
                  <span className="truncate text-base font-bold text-slate-100">
                    {last.playerName}
                  </span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {last.teamName} · pick {last.overall}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-slate-800/80 px-4 py-2 sm:px-5">
            <span className="text-[11px] font-semibold text-slate-500">
              {made.length} of {board.length} picks made
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <span
                style={{ width: `${done}%`, backgroundColor: clockColour }}
                className="block h-full rounded-full"
              />
            </span>
          </div>
        </section>

        {mayPick && clock && (
          <section className="rounded-xl border border-sky-800/60 bg-sky-950/20 p-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-sky-200">
              {clock.teamName} — round {clock.round}, pick {clock.overall}
            </h2>
            {/* A plain form, so the search works with no JavaScript and the
                address bar keeps what was typed. The pool is about twelve
                hundred names, so it is searched and capped rather than
                printed. */}
            <form method="get" className="mb-3 flex flex-wrap gap-2">
              {draft.id !== held[0]?.id && <input type="hidden" name="draft" value={draft.id} />}
              <input
                name="find"
                defaultValue={find}
                placeholder="Find a player"
                aria-label="Find a player"
                className="ui-input min-w-0 flex-1"
              />
              <button type="submit" className="ui-button">
                Search
              </button>
            </form>
            {pool.length === 0 ? (
              <EmptyState>
                {find ? "Nobody left in the pool is called that." : "Nobody left in the pool."}
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {pool.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2"
                  >
                    <PlayerHead name={player.displayName} size={24} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                      {player.displayName}
                    </span>
                    <PickButton
                      draftId={draft.id}
                      playerId={player.id}
                      playerName={player.displayName}
                      teamName={clock.teamName}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <Board board={board} crests={crests} clockOverall={clock?.overall} />

        {held.length > 1 && (
          <section>
            <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Other drafts
            </h2>
            <ul className="flex flex-wrap gap-2">
              {held.map((row) => (
                <li key={row.id}>
                  <a
                    href={`?draft=${row.id}`}
                    className={`inline-block rounded-md border px-3 py-1.5 text-xs font-semibold ${
                      row.id === draft.id
                        ? "border-sky-500 bg-sky-600/20 text-sky-200"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {row.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}
