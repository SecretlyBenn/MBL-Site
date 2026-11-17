import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { getBoard, getRoundLeagues, getSignups, onTheClock } from "@/db/draft";
import { drafts, teams } from "@/db/schema";
import { getLeagues } from "@/db/queries";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { DraftForm } from "./DraftForm";
import { SignupList } from "./SignupList";

export const metadata: Metadata = { title: "Draft" };
export const dynamic = "force-dynamic";

/**
 * Setting a draft up and running it.
 *
 * The board itself is public, under the competition - this is where its shape
 * is decided and where a pick is taken back. Both live here rather than on the
 * board so that the page the clubs are watching has nothing on it that could
 * change the draft by accident.
 */
export default async function AdminDraftPage() {
  await requireRole(["ADMIN"], "/admin/draft");
  const db = getDb();

  const [allLeagues, allTeams, held] = await Promise.all([
    getLeagues(),
    db
      .select({ id: teams.id, name: teams.name, leagueId: teams.leagueId })
      .from(teams)
      .orderBy(asc(teams.name)),
    db.select().from(drafts).orderBy(desc(drafts.id)),
  ]);

  // Each draft's order and how far it has got. A handful of drafts of a couple
  // of hundred picks each, read once for the page rather than once per row.
  const boards = await Promise.all(
    held.map(async (draft) => ({
      draft,
      board: await getBoard(draft.id),
      roundLeagues: await getRoundLeagues(draft.id),
      signups: draft.poolSource === "SIGNUPS" || draft.signupsOpen ? await getSignups(draft.id) : [],
    })),
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeader title="Set up a draft" />
        <DraftForm leagues={allLeagues} teams={allTeams} />
      </section>

      <section>
        <SectionHeader title="Drafts" meta={`${held.length}`} />
        {held.length === 0 ? (
          <EmptyState>No drafts yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {boards.map(({ draft, board, roundLeagues, signups }) => {
              const clock = onTheClock(board);
              const made = board.filter((pick) => pick.playerId !== null);
              const league = allLeagues.find((row) => row.id === draft.leagueId);
              // The order is the first round's picks, which is the order as it
              // was entered - a snake only turns it round afterwards.
              const order = board
                .filter((pick) => pick.round === 1)
                .map((pick) => pick.teamId);
              return (
                <li key={draft.id} className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
                  <DraftForm
                    leagues={allLeagues}
                    teams={allTeams}
                    draft={{
                      id: draft.id,
                      leagueId: draft.leagueId,
                      name: draft.name,
                      rounds: draft.rounds,
                      mode: draft.mode as "STRAIGHT" | "SNAKE",
                      teamIds: order,
                      pickSeconds: draft.pickSeconds,
                      startedAt: draft.startedAt,
                      signupsOpen: draft.signupsOpen,
                      poolSource: draft.poolSource as "ALL" | "SIGNUPS",
                      roundLeagues: Object.fromEntries(roundLeagues),
                    }}
                    status={
                      clock
                        ? `${made.length} of ${board.length} picks made · ${clock.teamName} on the clock`
                        : `All ${board.length} picks made`
                    }
                    lastPick={
                      made.length > 0
                        ? `${made[made.length - 1].teamName} took ${made[made.length - 1].playerName}`
                        : null
                    }
                    boardHref={league ? `/${league.slug}/draft?draft=${draft.id}` : null}
                  />
                  {signups.length > 0 && <SignupList draftId={draft.id} signups={signups} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
