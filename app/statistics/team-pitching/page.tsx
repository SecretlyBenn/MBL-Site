import type { Metadata } from "next";
import { TeamStatisticsPage } from "../StatisticsPages";

export const metadata: Metadata = {
  title: "Team Pitching Statistics",
  description:
    "Club-by-club pitching totals for every Minecraft Baseball League team, by season.",
  alternates: { canonical: "/statistics/team-pitching" },
};
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) { return <TeamStatisticsPage kind="pitching" searchParams={searchParams} />; }
