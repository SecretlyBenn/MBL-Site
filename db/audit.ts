import { auditLog } from "./schema";
import { getDb } from "./index";

export async function logAudit(entry: {
  actingUserId: number;
  action: string;
  entityType: string;
  entityId: number;
  detail?: unknown;
}) {
  const db = getDb();
  await db.insert(auditLog).values({
    actingUserId: entry.actingUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    detail: entry.detail !== undefined ? JSON.stringify(entry.detail) : null,
  });
}
