import type { Metadata } from "next";
import { IndividualStatisticsPage } from "../StatisticsPages";

export const metadata: Metadata = {
  title: "Pitching Statistics",
  description:
    "Minecraft Baseball League pitching statistics: ERA, WHIP, strikeouts, innings pitched, wins and saves, by season or across a career.",
  alternates: { canonical: "/statistics/pitching" },
};
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) { return <IndividualStatisticsPage kind="pitching" searchParams={searchParams} />; }
