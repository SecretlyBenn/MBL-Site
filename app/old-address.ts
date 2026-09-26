import { redirect } from "next/navigation";
import { getLeagues } from "@/db/queries";

/**
 * Sends an address from before the site held two leagues to the MBL's copy.
 *
 * Every link posted in Discord over the last year points at /standings or
 * /games/4015, and those pages now live under a league. Rather than break
 * them, the old address answers with a redirect to the first league - which is
 * the MBL, whose seasons are the ones those links were about.
 */
export async function toDefaultLeague(path: string): Promise<never> {
  const [first] = await getLeagues();
  redirect(`/${first?.slug ?? "mbl"}${path}`);
}
