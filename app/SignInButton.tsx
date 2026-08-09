import { getSession } from "./session";
import { getLeagueUser } from "./roles";

/**
 * Signed-out visitors get a sign-in link; signed-in ones get their name, their
 * league role if they hold one, and a way out. Someone signed in with Discord
 * but holding no `users` row is shown as a visitor - identity without access.
 */
export async function SignInButton() {
  // A missing AUTH_SECRET (or Discord credentials) should not take the whole
  // site down, so the nav degrades to a plain sign-in link instead.
  let session = null;
  let leagueUser = null;
  try {
    session = await getSession();
    if (session) leagueUser = await getLeagueUser();
  } catch {
    session = null;
  }

  if (!session) {
    return (
      <a
        href="/api/auth/discord"
        className="ml-auto rounded-md bg-[#5865F2] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4752c4]"
      >
        Sign in with Discord
      </a>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="flex flex-col leading-tight text-right">
        <span className="text-sm font-semibold text-slate-100">{session.displayName}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {leagueUser ? leagueUser.role.toLowerCase() : "visitor"}
        </span>
      </span>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
