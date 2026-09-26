import type { Metadata } from "next";
import { TeamStatisticsPage } from "../StatisticsPages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Team Pitching Statistics",
    description:
      "Club-by-club pitching totals for every Minecraft Baseball League team, by season.",
    alternates: { canonical: `/${league}/statistics/team-pitching` },
  };
}
export const dynamic = "force-dynamic";
export default function Page({ params, searchParams }: { params: Promise<{ league: string }>; searchParams: Promise<{ season?: string }> }) { return <TeamStatisticsPage kind="pitching" params={params} searchParams={searchParams} />; }
