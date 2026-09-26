import { toDefaultLeague } from "@/app/old-address";

export const dynamic = "force-dynamic";

/** Where this page was before the site held two leagues. */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  await toDefaultLeague(`/teams/${teamId}`);
}
