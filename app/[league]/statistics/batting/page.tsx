import type { Metadata } from "next";
import { IndividualStatisticsPage } from "../StatisticsPages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "Batting Statistics",
    description:
      "Minecraft Baseball League batting statistics: batting average, on-base, slugging, OPS, home runs and RBIs, by season or across a career.",
    alternates: { canonical: `/${league}/statistics/batting` },
  };
}
export const dynamic = "force-dynamic";
export default function Page({ params, searchParams }: { params: Promise<{ league: string }>; searchParams: Promise<{ season?: string }> }) { return <IndividualStatisticsPage kind="batting" params={params} searchParams={searchParams} />; }
