import type { Metadata } from "next";
import { and, asc, eq, inArray, or } from "drizzle-orm";
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
  searchParams: Promise<{ team?: string }>;
}) {
  const leagueUser = await requireRole(["GM", "ADMIN"], "/gm");

  const db = getDb();
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

  // A GM manages their own club. An admin has no club of their own, so they
  // choose one - previously they were silently given whichever team sorted
  // first, with no way to reach any other roster.
  const isAdmin = hasRole(leagueUser, "ADMIN");
  const chosen = Number((await searchParams).team);
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

  // The squad is the players who belong to the club plus anyone holding an
  // extra spot there - the MiBL's sent-down players, who stay available to
  // both clubs because the site cannot tell when they are down.
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
  const active = teamPlayers.filter((player) => player.status === "ACTIVE").sort(byName);
  const tripleA = teamPlayers.filter((player) => player.status === "TRIPLE_A").sort(byName);
  // A free agent belongs to a competition even with no club, so one league's
  // GM is never offered the other league's players. Before players carried a
  // league of their own this list was everybody, because a released player had
  // no club and so nothing saying whose free agent they were.
  const freeAgents = (
    await db
      .select()
      .from(players)
      .where(and(eq(players.status, "FREE_AGENT"), eq(players.leagueId, team?.leagueId ?? -1)))
  ).sort(byName);

  // Triple-A is the MBL's: the MiBL sits under it. A college club has nothing
  // beneath it, so the move is not offered there at all.
  const league = team?.leagueId
    ? await db.query.leagues.findFirst({ where: eq(leagues.id, team.leagueId) })
    : null;
  const canSendDown = league?.hasMinorLeague ?? false;

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
                  <RosterActionButton playerId={player.id} moveType="RELEASE" label="Release" className="ui-button-danger" />
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
          <SectionHeader title="Add a player" meta="new to the league" />
          <div className="mb-6">
            <p className="mb-2 text-xs text-slate-400">
              For someone who has never played here, so is in no pool to sign from.
              They join {team?.name} straight away.
            </p>
            <AddPlayerButton teamName={team?.name ?? "your club"} />
          </div>

          <SectionHeader title="Free agents" meta={`${freeAgents.length} available`} />
          <PlayerList players={freeAgents} empty="No free agents in the pool.">
            {(player) => <RosterActionButton playerId={player.id} moveType="SIGN" teamId={teamId} label="Sign" />}
          </PlayerList>
        </section>
      </div>
    </PageShell>
  );
}
