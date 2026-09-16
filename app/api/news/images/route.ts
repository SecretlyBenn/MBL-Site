import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { newsArticles, newsImages } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Uploads a picture for an article.
 *
 * There is no file storage on this plan, so a picture lives in the database
 * the way the club logos do. The browser resizes it before sending, and the
 * cap here is the backstop for a bypassed form.
 */

const ALLOWED_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);
/** Base64 characters: about 1.1 MB of image, which is a wide photograph. */
const MAX_BASE64_LENGTH = 1_500_000;

export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["ADMIN", "WRITER"]);
    const { articleId, dataUrl } = (await request.json()) as { articleId: number; dataUrl: string };

    const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
    if (!match || !ALLOWED_TYPES.has(match[1])) {
      return Response.json({ error: "Upload a PNG, WebP or JPEG image." }, { status: 400 });
    }
    const [, contentType, data] = match;
    if (data.length > MAX_BASE64_LENGTH) {
      return Response.json({ error: "That picture is too large. Try a smaller one." }, { status: 413 });
    }

    const db = getDb();
    const article = await db.query.newsArticles.findFirst({
      where: eq(newsArticles.id, Number(articleId)),
    });
    if (!article) return Response.json({ error: "No such article." }, { status: 404 });
    if (user.role !== "ADMIN" && article.authorUserId !== user.id) {
      return Response.json({ error: "That is not your article." }, { status: 403 });
    }

    const [image] = await db
      .insert(newsImages)
      .values({ articleId: article.id, contentType, data, uploadedBy: user.id })
      .returning({ id: newsImages.id });

    await logAudit({
      actingUserId: user.id,
      action: "news.image.upload",
      entityType: "news",
      entityId: article.id,
      detail: { imageId: image.id, bytes: Math.round((data.length * 3) / 4) },
    });

    return Response.json({ id: image.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
