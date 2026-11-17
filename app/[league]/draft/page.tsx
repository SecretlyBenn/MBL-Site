import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { draftablePlayers, getBoard, onTheClock } from "@/db/draft";
import { drafts } from "@/db/schema";
import { getLeagueUser, hasRole } from "@/app/roles";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { PlayerHead } from "@/app/PlayerHead";
import { leagueFrom } from "../league";
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
 * keeps the stadium scoreboards from polling, and a draft takes an evening. It
 * says when it was drawn and the clubs reload it.
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

  const board = await getBoard(draft.id);
  const clock = onTheClock(board);
  const user = await getLeagueUser();
  // An admin picks for anybody, which is what gets a draft past a GM who has
  // gone to bed. A GM picks when it is their club's turn.
  const mayPick =
    clock !== undefined &&
    user !== null &&
    (hasRole(user, "ADMIN") || (hasRole(user, "GM") && user.teamId === clock.teamId));

  const pool = mayPick ? await draftablePlayers(draft.id, league, find) : [];

  const rounds = Array.from({ length: draft.rounds }, (_, index) => index + 1).filter((round) =>
    board.some((pick) => pick.round === round),
  );
  const made = board.filter((pick) => pick.playerId !== null).length;

  return (
    <PageShell
      title={draft.name}
      subtitle={`${league.name} · ${draft.mode === "SNAKE" ? "Snake" : "Straight"} · ${draft.rounds} rounds · ${made} of ${board.length} picks made`}
    >
      <div className="flex flex-col gap-6">
        <section className="ui-card p-4">
          {clock ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                On the clock
              </span>
              <span className="text-xl font-black text-sky-300">{clock.teamName}</span>
              <span className="text-xs text-slate-400">
                Round {clock.round} · pick {clock.overall}
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-emerald-300">
              Every pick has been made. The draft is over.
            </p>
          )}
        </section>

        {mayPick && clock && (
          <section className="ui-card p-4">
            <SectionHeader title={`${clock.teamName}'s pick`} meta={`Round ${clock.round}`} />
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
              <ul className="flex flex-col gap-1.5">
                {pool.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2"
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

        {rounds.map((round) => (
          <section key={round}>
            <SectionHeader title={`Round ${round}`} />
            <ul className="flex flex-col gap-1.5">
              {board
                .filter((pick) => pick.round === round)
                .map((pick) => (
                  <li
                    key={pick.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      pick.overall === clock?.overall
                        ? "border-sky-500/60 bg-sky-950/30"
                        : "border-slate-800/80 bg-slate-900/40"
                    }`}
                  >
                    <span className="w-10 shrink-0 text-xs font-bold text-slate-500">
                      {pick.overall}
                    </span>
                    <span className="w-28 shrink-0 truncate text-sm font-semibold text-slate-300">
                      {pick.teamName}
                    </span>
                    {pick.playerName ? (
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <PlayerHead name={pick.playerName} size={20} />
                        <span className="truncate text-sm font-bold text-slate-100">
                          {pick.playerName}
                        </span>
                      </span>
                    ) : (
                      <span className="flex-1 text-sm text-slate-600">—</span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}

        {held.length > 1 && (
          <section>
            <SectionHeader title="Other drafts" />
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
