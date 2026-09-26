import { toDefaultLeague } from "@/app/old-address";

export const dynamic = "force-dynamic";

/** Where this page was before the site held two leagues. */
export default async function Page() {
  await toDefaultLeague("/statistics/team-batting");
}
