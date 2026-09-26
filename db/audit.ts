import { auditLog } from "./schema";
import { getDb } from "./index";
import { errorChain } from "./errors";

/**
 * Records an admin action.
 *
 * The audit row is written after the change it describes has already been
 * made, so a failure here must not fail the request. Letting it throw told an
 * admin "Something went wrong. Nothing was changed." about a change that had
 * in fact gone through, and sent them back to redo work that was already done
 * - much worse than a missing log line. The reason is logged instead, with the
 * database's own message rather than just the query that failed.
 */
export async function logAudit(entry: {
  actingUserId: number;
  action: string;
  entityType: string;
  entityId: number;
  detail?: unknown;
}) {
  const db = getDb();
  try {
    await db.insert(auditLog).values({
      actingUserId: entry.actingUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      detail: entry.detail !== undefined ? JSON.stringify(entry.detail) : null,
    });
  } catch (error) {
    console.error(
      `audit: ${entry.action} on ${entry.entityType} ${entry.entityId} was not recorded - ` +
        errorChain(error).join(" | "),
    );
  }
}
