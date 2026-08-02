import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { players, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { RosterActionButton } from "./RosterActions";

export const dynamic = "force-dynamic";

export default async function GmPage() {
  const leagueUser = await requireRole(["GM", "ADMIN"], "/gm");

  const db = getDb();
  const allTeams = await db.select().from(teams);
  const teamId = leagueUser.teamId ?? allTeams[0]?.id ?? null;
  const team = allTeams.find((row) => row.id === teamId);

  if (!teamId) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-red-600">Your account has no team assigned. Contact an admin.</p>
      </main>
    );
  }

  const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId));
  const active = teamPlayers.filter((player) => player.status === "ACTIVE");
  const tripleA = teamPlayers.filter((player) => player.status === "TRIPLE_A");
  const freeAgents = await db.select().from(players).where(eq(players.status, "FREE_AGENT"));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-2xl font-bold">{team?.name ?? "Your team"} roster</h1>
      <p className="mb-6 text-sm text-gray-500">
        Signed in as {leagueUser.displayName} ({leagueUser.role})
      </p>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Active roster</h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">No active players.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((player) => (
              <li key={player.id} className="flex items-center justify-between rounded border p-2">
                <span>{player.displayName}</span>
                <div className="flex gap-2">
                  <RosterActionButton playerId={player.id} moveType="SEND_DOWN" label="Send to AAA" />
                  <RosterActionButton
                    playerId={player.id}
                    moveType="RELEASE"
                    label="Release"
                    className="rounded bg-red-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Triple-A</h2>
        {tripleA.length === 0 ? (
          <p className="text-sm text-gray-500">No players on the farm team.</p>
        ) : (
          <ul className="space-y-2">
            {tripleA.map((player) => (
              <li key={player.id} className="flex items-center justify-between rounded border p-2">
                <span>{player.displayName}</span>
                <div className="flex gap-2">
                  <RosterActionButton playerId={player.id} moveType="RECALL" label="Recall" />
                  <RosterActionButton
                    playerId={player.id}
                    moveType="RELEASE"
                    label="Release"
                    className="rounded bg-red-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Free agents</h2>
        {freeAgents.length === 0 ? (
          <p className="text-sm text-gray-500">No free agents in the pool.</p>
        ) : (
          <ul className="space-y-2">
            {freeAgents.map((player) => (
              <li key={player.id} className="flex items-center justify-between rounded border p-2">
                <span>{player.displayName}</span>
                <RosterActionButton playerId={player.id} moveType="SIGN" teamId={teamId} label="Sign" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
