import type { Metadata } from "next";
import { and, asc, eq, inArray, like, ne, notInArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { leagues, players, rosterSpots, teams } from "@/db/schema";
import { hasRole, requireRole } from "@/app/roles";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { AddPlayerButton, RosterActionButton } from "./RosterActions";
import { TeamPicker } from "./TeamPicker";

export const metadata: Metadata = {
  title: "General Manager",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/** Names offered at once before the search box is the only way through. */
const POOL_LIMIT = 40;

function PlayerList({
  players: list,
  empty,
  children,
}: {
  players: { id: number; displayName: string }[];
  empty: string;
  children: (player: { id: number; displayName: string }) => React.ReactNode;
}) {
  if (list.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="ui-card px-3">
      {list.map((player) => (
        <li
          key={player.id}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 py-2 last:border-0"
        >
          <span className="font-medium text-slate-100">{player.displayName}</span>
          <div className="flex gap-2">{children(player)}</div>
        </li>
      ))}
    </ul>
  );
}

export default async function GmPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; find?: string }>;
}) {
  const leagueUser = await requireRole(["GM", "ADMIN"], "/gm");

  const db = getDb();
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

  // A GM manages their own club. An admin has no club of their own, so they
  // choose one - previously they were silently given whichever team sorted
  // first, with no way to reach any other roster.
  const isAdmin = hasRole(leagueUser, "ADMIN");
  const { team: teamParam, find: findParam } = await searchParams;
  const find = findParam?.trim() ?? "";
  const chosen = Number(teamParam);
  const teamId = isAdmin
    ? (allTeams.some((row) => row.id === chosen) ? chosen : allTeams[0]?.id ?? null)
    : leagueUser.teamId;
  const team = allTeams.find((row) => row.id === teamId);

  if (!teamId) {
    return (
      <PageShell title="General Manager">
        <EmptyState>Your account has no team assigned yet. Ask a league admin to set your team.</EmptyState>
      </PageShell>
    );
  }

  // The competition decides both halves of this page. Triple-A is the MBL's:
  // the MiBL sits under it, and a college club has nothing beneath it, so the
  // move is not offered there at all. A tournament owns no players, so it
  // picks from the whole site and lets them go again without touching the
  // clubs they came from.
  const league = team?.leagueId
    ? await db.query.leagues.findFirst({ where: eq(leagues.id, team.leagueId) })
    : null;
  const canSendDown = league?.hasMinorLeague ?? false;
  const isTournament = league?.isTournament ?? false;

  // The squad is the players who belong to the club plus anyone holding an
  // extra spot there - the MiBL's sent-down players, and the whole of a
  // tournament club. The two are counted differently on purpose: belonging to
  // a club puts you on its roster only while you are active on it, whereas a
  // spot is itself the statement that you turn out for that club, whatever
  // your own club has you down as.
  const spots = await db
    .select({ playerId: rosterSpots.playerId })
    .from(rosterSpots)
    .where(eq(rosterSpots.teamId, teamId));
  const spotIds = new Set(spots.map((row) => row.playerId));
  const teamPlayers = await db
    .select()
    .from(players)
    .where(
      or(
        eq(players.teamId, teamId),
        inArray(
          players.id,
          db.select({ id: rosterSpots.playerId }).from(rosterSpots).where(eq(rosterSpots.teamId, teamId)),
        ),
      ),
    );
  const byName = (a: { displayName: string }, b: { displayName: string }) => a.displayName.localeCompare(b.displayName);
  const active = teamPlayers
    .filter((player) => (spotIds.has(player.id) ? player.status !== "RELEASED" : player.status === "ACTIVE"))
    .sort(byName);
  const tripleA = teamPlayers
    .filter((player) => player.teamId === teamId && player.status === "TRIPLE_A")
    .sort(byName);

  // The pool this club may pick from.
  //
  // An ordinary club sees its own competition's free agents: a free agent
  // belongs to a competition even with no club, so one league's GM is never
  // offered the other league's players. A tournament club sees everybody who
  // is not already spoken for in that tournament, which is the point of it.
  //
  // Searched and capped rather than listed. Every man who has ever played a
  // game here is in the pool now, which is about twelve hundred names, and
  // rendering them all would spend more than this page's whole CPU budget
  // printing a list nobody can find a name in anyway.
  const pool = await db
    .select()
    .from(players)
    .where(
      and(
        isTournament
          ? and(
              ne(players.status, "RELEASED"),
              notInArray(
                players.id,
                db
                  .select({ id: rosterSpots.playerId })
                  .from(rosterSpots)
                  .innerJoin(teams, eq(teams.id, rosterSpots.teamId))
                  .where(eq(teams.leagueId, team?.leagueId ?? -1)),
              ),
            )
          : and(eq(players.status, "FREE_AGENT"), eq(players.leagueId, team?.leagueId ?? -1)),
        find ? like(players.displayName, `%${find}%`) : undefined,
      ),
    )
    .orderBy(asc(players.displayName))
    .limit(POOL_LIMIT + 1);
  const shown = pool.slice(0, POOL_LIMIT);
  const more = pool.length > POOL_LIMIT;

  return (
    <PageShell
      header={
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-800/80 pb-3">
          {team && <TeamLogo teamName={team.name} className="h-12 w-12" />}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">{team?.name ?? "Your team"}</h1>
            <p className="text-sm text-slate-400">
              Roster management · {leagueUser.displayName}
            </p>
          </div>
          {isAdmin && (
            <TeamPicker teams={allTeams.map((row) => ({ id: row.id, name: row.name }))} teamId={teamId} />
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section>
            <SectionHeader title="Active roster" meta={`${active.length} players`} />
            <PlayerList players={active} empty="No active players.">
              {(player) => (
                <>
                  {canSendDown && (
                    <RosterActionButton playerId={player.id} moveType="SEND_DOWN" label="Send to AAA" />
                  )}
                  {/* The club is sent with a release too, because a tournament
                      club is never the one the player belongs to - without it
                      the API could not tell whose roster he is leaving. */}
                  <RosterActionButton
                    playerId={player.id}
                    moveType="RELEASE"
                    teamId={teamId}
                    label={isTournament ? "Drop" : "Release"}
                    className="ui-button-danger"
                  />
                </>
              )}
            </PlayerList>
          </section>

          {(canSendDown || tripleA.length > 0) && (
          <section>
            <SectionHeader title="Triple-A" meta={`${tripleA.length} players`} />
            <PlayerList players={tripleA} empty="No players on the farm team.">
              {(player) => (
                <>
                  <RosterActionButton playerId={player.id} moveType="RECALL" label="Recall" />
                  <RosterActionButton playerId={player.id} moveType="RELEASE" label="Release" className="ui-button-danger" />
                </>
              )}
            </PlayerList>
          </section>
          )}
        </div>

        <section>
          {/* A tournament is played by men who have played here already, so
              there is nobody to add who is not in the pool below. */}
          {!isTournament && (
            <>
              <SectionHeader title="Add a player" meta="new to the league" />
              <div className="mb-6">
                <p className="mb-2 text-xs text-slate-400">
                  For someone who has never played here, so is in no pool to sign from.
                  They join {team?.name} straight away.
                </p>
                <AddPlayerButton teamName={team?.name ?? "your club"} />
              </div>
            </>
          )}

          <SectionHeader
            title={isTournament ? "Player pool" : "Free agents"}
            meta={more ? `first ${POOL_LIMIT} of more` : `${shown.length} available`}
          />
          {/* An ordinary GET form. The pool is twelve hundred names long and
              needs narrowing, and nothing about narrowing it needs
              JavaScript. */}
          <form action="/gm" method="get" className="mb-3 flex flex-wrap gap-2">
            <input type="hidden" name="team" value={teamId} />
            <input
              name="find"
              defaultValue={find}
              placeholder="Search by name"
              aria-label="Search the player pool"
              className="ui-input min-w-0 flex-1"
            />
            <button type="submit" className="ui-button">Search</button>
          </form>
          <PlayerList
            players={shown}
            empty={find ? `Nobody in the pool is called that.` : "Nobody in the pool."}
          >
            {(player) => (
              <RosterActionButton
                playerId={player.id}
                moveType="SIGN"
                teamId={teamId}
                label={isTournament ? "Add" : "Sign"}
              />
            )}
          </PlayerList>
          {more && (
            <p className="mt-2 text-xs text-slate-500">
              Only the first {POOL_LIMIT} are listed. Search for the player you want.
            </p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
