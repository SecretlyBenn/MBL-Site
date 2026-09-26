import { redirect } from "next/navigation";
import { getLeagues } from "@/db/queries";

export const dynamic = "force-dynamic";

/**
 * The site's front door sends people to a league.
 *
 * Both leagues have their own home page now, and the first one is the MBL. A
 * redirect rather than a chooser: nobody arriving at the address wants to be
 * asked a question before seeing a score.
 */
export default async function Home() {
  const [first] = await getLeagues();
  redirect(`/${first?.slug ?? "mbl"}`);
}
