import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLeagueRosters } from "@/db/queries";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { TeamLogo } from "@/app/TeamLogo";
import { leagueFrom } from "../league";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Rosters",
    description: "Who is on each club right now, as the roster bot has them.",
    alternates: { canonical: `/${league}/rosters` },
  };
}

export const dynamic = "force-dynamic";

/**
 * Who is on each club today.
 *
 * The archive's rosters are a record of a season that has finished and they
 * live under Seasons. This is the other question, and the one most people are
 * asking: who turns out this week. It is the same list an umpire picks a
 * lineup from, because it is built by the same rule - so if a man is not here
 * he cannot be put in a lineup, and that is a thing you can check rather than
 * discover at the plate.
 *
 * A player sent down shows on the affiliate he was sent to, not on his own
 * club, because he holds a spot there and is no longer active on his own.
 */
export default async function RostersPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string; team?: string }>;
}) {
  const league = await leagueFrom(params);
  const asked = await searchParams;

  // This page used to be the season archive, and links to it were written
  // with a season on them. Those mean the archive, which is under Seasons
  // now, so they are sent there rather than quietly answering a different
  // question with this season's roster.
  if (asked.season) {
    const team = asked.team ? `&team=${asked.team}` : "";
    redirect(`/${league.slug}/seasons?season=${asked.season}${team}`);
  }

  const { clubs, roster } = await getLeagueRosters(league.id);

  const byClub = new Map<number, typeof roster>();
  for (const player of roster) {
    const squad = byClub.get(player.teamId);
    if (squad) squad.push(player);
    else byClub.set(player.teamId, [player]);
  }

  if (clubs.length === 0) {
    return (
      <PageShell title="Rosters">
        <EmptyState>No clubs have been added to this competition yet.</EmptyState>
      </PageShell>
    );
  }

  return (
    <PageShell
      wide
      title="Rosters"
      subtitle="Who is on each club right now."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {clubs.map((club) => {
          const squad = (byClub.get(club.id) ?? []).sort((a, b) =>
            a.displayName.localeCompare(b.displayName),
          );
          return (
            <section key={club.id}>
              <div className="mb-2 flex items-center gap-3">
                <TeamLogo teamName={club.name} className="h-8 w-8" />
                <SectionHeader title={club.name} meta={`${squad.length} players`} />
              </div>
              {squad.length === 0 ? (
                <EmptyState>Nobody is on this roster.</EmptyState>
              ) : (
                <ul className="ui-card px-3">
                  {squad.map((player) => (
                    <li
                      key={`${club.id}-${player.id}`}
                      className="flex items-center justify-between gap-2 border-b border-slate-800/60 py-1.5 last:border-0"
                    >
                      <span className="truncate text-slate-100">{player.displayName}</span>
                      {/* Only worth saying when he is here on loan rather than
                          as one of the club's own. */}
                      {player.status !== "ACTIVE" && (
                        <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {player.status === "TRIPLE_A" ? "Sent down" : player.status.toLowerCase()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
