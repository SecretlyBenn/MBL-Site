import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { logoKey } from "@/db/logos";
import { teamLogos, teams } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Uploads a club's logo, or removes an upload so the built-in logo shows again.
 *
 * The browser resizes the image before sending it, so what arrives is small;
 * the size cap here is a backstop against a bypassed form, not the normal
 * path. Stored against the club's name, so it shows on every season that club
 * appears in.
 */

const ALLOWED_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);
/** Base64 characters. About 375 KB of image - a resized logo is a fraction. */
const MAX_BASE64_LENGTH = 500_000;

function errorResponse(error: unknown) {
  return apiError(error);
}

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const { teamId, dataUrl } = (await request.json()) as { teamId: number; dataUrl: string };

    const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
    if (!match || !ALLOWED_TYPES.has(match[1])) {
      return Response.json({ error: "Upload a PNG, WebP or JPEG image." }, { status: 400 });
    }
    const [, contentType, data] = match;
    if (data.length > MAX_BASE64_LENGTH) {
      return Response.json({ error: "That image is too large. Try a smaller file." }, { status: 413 });
    }

    const db = getDb();
    const team = await db.query.teams.findFirst({ where: eq(teams.id, Number(teamId)) });
    if (!team) return Response.json({ error: "That team does not exist." }, { status: 404 });

    const updatedAt = new Date().toISOString();
    await db
      .insert(teamLogos)
      .values({ teamName: logoKey(team.name), contentType, data, updatedAt })
      .onConflictDoUpdate({ target: teamLogos.teamName, set: { contentType, data, updatedAt } });

    await logAudit({
      actingUserId: leagueUser.id,
      action: "team.logo.upload",
      entityType: "team",
      entityId: team.id,
      detail: { name: team.name, bytes: Math.round((data.length * 3) / 4) },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const teamId = Number(new URL(request.url).searchParams.get("teamId"));

    const db = getDb();
    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    if (!team) return Response.json({ error: "That team does not exist." }, { status: 404 });

    await db.delete(teamLogos).where(eq(teamLogos.teamName, logoKey(team.name)));
    await logAudit({
      actingUserId: leagueUser.id,
      action: "team.logo.remove",
      entityType: "team",
      entityId: team.id,
      detail: { name: team.name },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
