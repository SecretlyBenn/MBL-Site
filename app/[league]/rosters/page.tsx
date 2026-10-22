import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAvatarsFor, getLeagueRosters } from "@/db/queries";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { leagueFrom } from "../league";
import { RosterBoard, type RosterPlayer } from "./RosterBoard";

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
 * lineup from, because it is built by the same rule - so if a man is not in
 * the top list here he cannot be put in a lineup, and that is a thing you can
 * check rather than discover at the plate.
 *
 * A club shows its injured and its sent-down men as well, in their own
 * sections. They are still the club's players and a GM needs to see them; the
 * point of keeping them apart is that neither can be picked.
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

  const { clubs, roster, sentTo } = await getLeagueRosters(league.id);

  if (clubs.length === 0) {
    return (
      <PageShell title="Rosters">
        <EmptyState>No clubs have been added to this competition yet.</EmptyState>
      </PageShell>
    );
  }

  const squads: Record<number, RosterPlayer[]> = {};
  for (const player of roster) (squads[player.teamId] ??= []).push(player);

  // One lookup for the whole league rather than one per club, because the
  // picker can reach any of them without coming back here.
  const avatars = await getAvatarsFor(roster.map((player) => player.displayName));

  return (
    <PageShell wide title="Rosters" subtitle="Who is on each club right now.">
      <RosterBoard
        leagueSlug={league.slug}
        clubs={clubs}
        squads={squads}
        avatars={avatars}
        sentTo={sentTo}
      />
    </PageShell>
  );
}
