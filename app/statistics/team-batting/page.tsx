import type { Metadata } from "next";
import { TeamStatisticsPage } from "../StatisticsPages";

export const metadata: Metadata = {
  title: "Team Batting Statistics",
  description:
    "Club-by-club batting totals for every Minecraft Baseball League team, by season.",
  alternates: { canonical: "/statistics/team-batting" },
};
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) { return <TeamStatisticsPage kind="batting" searchParams={searchParams} />; }
