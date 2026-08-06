import { IndividualStatisticsPage } from "../StatisticsPages";
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) { return <IndividualStatisticsPage kind="pitching" searchParams={searchParams} />; }
