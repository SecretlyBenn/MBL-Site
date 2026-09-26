import type { Metadata } from "next";
import { IndividualStatisticsPage } from "../StatisticsPages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Pitching Statistics",
    description:
      "Minecraft Baseball League pitching statistics: ERA, WHIP, strikeouts, innings pitched, wins and saves, by season or across a career.",
    alternates: { canonical: `/${league}/statistics/pitching` },
  };
}
export const dynamic = "force-dynamic";
export default function Page({ params, searchParams }: { params: Promise<{ league: string }>; searchParams: Promise<{ season?: string }> }) { return <IndividualStatisticsPage kind="pitching" params={params} searchParams={searchParams} />; }
