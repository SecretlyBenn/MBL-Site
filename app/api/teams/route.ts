import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { teams } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type TeamPayload = {
  name: string;
  abbreviation: string;
  color?: string;
  logoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as TeamPayload;

    const name = payload.name?.trim();
    const abbreviation = payload.abbreviation?.trim().toUpperCase();
    if (!name || !abbreviation) {
      return Response.json(
        { error: "name and abbreviation are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const [team] = await db
      .insert(teams)
      .values({
        name,
        abbreviation,
        color: payload.color?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
      })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: "team.create",
      entityType: "team",
      entityId: team.id,
      detail: { name, abbreviation },
    });

    return Response.json({ team }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("UNIQUE constraint")) {
      return Response.json({ error: "A team with that name already exists." }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
