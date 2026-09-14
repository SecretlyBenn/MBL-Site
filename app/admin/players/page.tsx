import type { Metadata } from "next";
import { asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { historicalPlayerStats, minecraftProfiles, players, teams } from "@/db/schema";
import { requireRole } from "@/app/roles";
import { EmptyState, SectionHeader } from "@/app/SiteNav";
import { AddPlayersForm, LinkAccountForm, PlayerRow, QuickLinkRow, RenamePlayerForm } from "../AdminForms";
import { QueryPicker } from "../QueryPicker";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

/**
 * The player pool, one team at a time.
 *
 * "Missing a Minecraft account" lists every name the site shows without a
 * linked account - current players and archived ones alike - since those are
 * the names drawn with a blank head.
 */
export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireRole(["ADMIN"], "/admin/players");
  const db = getDb();
  const { show: requested } = await searchParams;

  const [allTeams, linked] = await Promise.all([
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
    db.select({ name: minecraftProfiles.playerName }).from(minecraftProfiles),
  ]);
  const linkedNames = new Set(linked.map((row) => row.name));

  const show = requested ?? (allTeams[0] ? String(allTeams[0].id) : "free");
  const options = [
    ...allTeams.map((team) => ({ value: String(team.id), label: team.name })),
    { value: "free", label: "Free agents & released" },
    { value: "unlinked", label: "Missing a Minecraft account" },
  ];

  let heading = "";
  let pool: (typeof players.$inferSelect)[] = [];
  let unlinkedNames: string[] = [];

  if (show === "unlinked") {
    heading = "Missing a Minecraft account";
    const [poolRows, archived] = await Promise.all([
      db.select({ name: players.displayName }).from(players),
      db
        .selectDistinct({ name: historicalPlayerStats.playerName })
        .from(historicalPlayerStats)
        .leftJoin(minecraftProfiles, eq(minecraftProfiles.playerName, historicalPlayerStats.playerName))
        .where(isNull(minecraftProfiles.uuid)),
    ]);
    unlinkedNames = [...new Set([...poolRows.map((row) => row.name), ...archived.map((row) => row.name)])]
      .filter((name) => !linkedNames.has(name))
      .sort((a, b) => a.localeCompare(b));
  } else if (show === "free") {
    heading = "Free agents & released";
    pool = await db.select().from(players).where(isNull(players.teamId));
  } else {
    const teamId = Number(show);
    heading = allTeams.find((team) => team.id === teamId)?.name ?? "Team";
    pool = await db.select().from(players).where(eq(players.teamId, teamId));
  }
  // Sorted here rather than in SQL, which puts every capitalised name ahead of
  // every lowercase one.
  pool.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));

  // Suggestions for the rename and link forms: every name the site knows.
  const archivedNames = await db.selectDistinct({ name: historicalPlayerStats.playerName }).from(historicalPlayerStats);
  const allNames = [...new Set([...pool.map((player) => player.displayName), ...archivedNames.map((row) => row.name)])].sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section className="min-w-0">
        <div className="mb-4">
          <QueryPicker label="Show" param="show" value={show} options={options} />
        </div>

        {show === "unlinked" ? (
          <>
            <SectionHeader title={heading} meta={`${unlinkedNames.length} names`} />
            {unlinkedNames.length === 0 ? (
              <EmptyState>Every name on the site has a Minecraft account linked.</EmptyState>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-400">
                  The box starts with the name as the site shows it. If the player has renamed since,
                  type the name they use now, then Link.
                </p>
                <ul className="ui-card px-3">
                  {unlinkedNames.map((name) => (
                    <QuickLinkRow key={name} name={name} />
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <>
            <SectionHeader title={heading} meta={`${pool.length} players`} />
            {pool.length === 0 ? (
              <EmptyState>No players here.</EmptyState>
            ) : (
              <ul className="ui-card px-3">
                {pool.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={{ ...player, linked: linkedNames.has(player.displayName) }}
                    teams={allTeams}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <AddPlayersForm teams={allTeams} />
        <LinkAccountForm />
        <RenamePlayerForm />
        <datalist id="admin-player-names">
          {allNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </aside>
    </div>
  );
}
