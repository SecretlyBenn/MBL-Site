import { toDefaultLeague } from "@/app/old-address";

export const dynamic = "force-dynamic";

/** Where this page was before the site held two leagues. */
export default async function Page({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  await toDefaultLeague(`/players/${playerId}`);
}
