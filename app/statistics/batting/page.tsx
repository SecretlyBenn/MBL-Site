import type { Metadata } from "next";
import { IndividualStatisticsPage } from "../StatisticsPages";

export const metadata: Metadata = {
  title: "Batting Statistics",
  description:
    "Minecraft Baseball League batting statistics: batting average, on-base, slugging, OPS, home runs and RBIs, by season or across a career.",
  alternates: { canonical: "/statistics/batting" },
};
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) { return <IndividualStatisticsPage kind="batting" searchParams={searchParams} />; }
