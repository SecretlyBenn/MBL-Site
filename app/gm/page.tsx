import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { players, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { RosterActionButton } from "./RosterActions";
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
  const isAdmin = leagueUser.role === "ADMIN";
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

  const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId));
  const byName = (a: { displayName: string }, b: { displayName: string }) => a.displayName.localeCompare(b.displayName);
  const active = teamPlayers.filter((player) => player.status === "ACTIVE").sort(byName);
  const tripleA = teamPlayers.filter((player) => player.status === "TRIPLE_A").sort(byName);
  const freeAgents = (await db.select().from(players).where(eq(players.status, "FREE_AGENT"))).sort(byName);

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
                  <RosterActionButton playerId={player.id} moveType="SEND_DOWN" label="Send to AAA" />
                  <RosterActionButton playerId={player.id} moveType="RELEASE" label="Release" className="ui-button-danger" />
                </>
              )}
            </PlayerList>
          </section>

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
        </div>

        <section>
          <SectionHeader title="Free agents" meta={`${freeAgents.length} available`} />
          <PlayerList players={freeAgents} empty="No free agents in the pool.">
            {(player) => <RosterActionButton playerId={player.id} moveType="SIGN" teamId={teamId} label="Sign" />}
          </PlayerList>
        </section>
      </div>
    </PageShell>
  );
}
