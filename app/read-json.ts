/**
 * The answer to one of the scorecard requests.
 *
 * Every one of those routes replies with JSON, including when it refuses, so
 * the obvious thing is to parse and read the error off it. But a request that
 * never reaches a route comes back as a page instead - a session that expired,
 * a worker that threw, a deploy still swapping over - and parsing first turned
 * every one of those into "Unexpected token '<'", which tells an umpire
 * nothing and sends them looking for a mistake in their own scoring.
 *
 * So: read it as text, say what actually happened if it is not JSON, and only
 * then look at whether the route agreed to it.
 */
export async function readJson<T extends object>(
  response: Response,
  fallback = "Something went wrong.",
): Promise<T> {
  const body = await response.text();
  let parsed: T;
  try {
    parsed = (body ? JSON.parse(body) : {}) as T;
  } catch {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Your session has expired - sign in again and the card will still be here."
        : `The server did not answer that (HTTP ${response.status}). Nothing was saved; try again in a moment.`,
    );
  }
  if (!response.ok) throw new Error((parsed as { error?: string }).error ?? fallback);
  return parsed;
}
