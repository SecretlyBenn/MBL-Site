import { errorChain } from "@/db/errors";
import { RoleError } from "./roles";

/**
 * Turns a thrown error into the JSON response an API route sends back.
 *
 * The database layer wraps a failed statement in an error whose message is the
 * full SQL and its parameters, with the database's own reason one level down in
 * `cause`. Sending that message on showed visitors the query itself and hid
 * the one useful fact - that a name was already taken - so both levels are
 * checked, and anything unrecognised becomes a plain message.
 */
export function apiError(error: unknown, duplicateMessage = "That already exists.") {
  if (error instanceof RoleError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const messages = errorChain(error);
  const text = messages.join(" | ");

  if (text.includes("UNIQUE constraint")) {
    return Response.json({ error: duplicateMessage }, { status: 409 });
  }
  if (text.includes("FOREIGN KEY constraint")) {
    return Response.json(
      { error: "Something else still refers to this, so it can't be changed that way." },
      { status: 409 },
    );
  }

  // The whole chain: the outer message is only the query that failed, and the
  // reason it failed is further down.
  console.error(text || error);
  // A message written by our own code is safe to show; a database one is not.
  const own = messages[0] && !messages[0].startsWith("Failed query") ? messages[0] : null;
  return Response.json({ error: own ?? "Something went wrong. Nothing was changed." }, { status: 500 });
}
