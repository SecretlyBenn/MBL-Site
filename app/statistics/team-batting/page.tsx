import { TeamStatisticsPage } from "../StatisticsPages";
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) { return <TeamStatisticsPage kind="batting" searchParams={searchParams} />; }
