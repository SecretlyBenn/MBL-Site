/**
 * Every message in an error's `cause` chain, outermost first.
 *
 * The database layer wraps a failed statement in an error whose message is the
 * full SQL and its parameters, and puts the database's own reason - the part
 * that says what was actually wrong - one level down in `cause`. Logging or
 * matching on the error alone therefore records the query and loses the
 * reason, which is how a broken statement stayed a mystery once already.
 */
export function errorChain(error: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < 4; depth += 1) {
    messages.push(current.message);
    current = current.cause;
  }
  return messages;
}
