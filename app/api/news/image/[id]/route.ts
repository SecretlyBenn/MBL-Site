import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { newsImages } from "@/db/schema";

/**
 * Serves a picture from an article.
 *
 * A picture is never replaced in place - an edit uploads a new one - so every
 * address here is permanent and browsers are told to keep it for a year.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not a picture", { status: 400 });

  const image = await getDb().query.newsImages.findFirst({ where: eq(newsImages.id, id) });
  if (!image) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  const bytes = Uint8Array.from(atob(image.data), (character) => character.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
