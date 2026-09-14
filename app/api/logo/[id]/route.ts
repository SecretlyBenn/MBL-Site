import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { teamLogos } from "@/db/schema";

/**
 * Serves a logo uploaded through the admin page.
 *
 * Every link to one carries the upload's timestamp (?v=...), so a replaced
 * logo is a new address. That makes each address permanent, and browsers are
 * told to keep it for a year rather than asking this Worker again.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not a logo", { status: 400 });

  const logo = await getDb().query.teamLogos.findFirst({ where: eq(teamLogos.id, id) });
  if (!logo) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  const bytes = Uint8Array.from(atob(logo.data), (char) => char.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
