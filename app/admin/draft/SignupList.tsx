"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Signup = {
  id: number;
  discordName: string;
  typedName: string;
  playerId: number | null;
  playerName: string | null;
  leagueId: number | null;
  positions: string | null;
};

/**
 * Who has put their name down, and the one job an admin has in it: saying who
 * the unmatched ones are.
 *
 * A sign-up matches a player by the name given, which is all this site and the
 * roster bot have ever shared. Anything that does not match is left for a
 * person, because the archive is keyed by name - guessing would weld one man's
 * career onto another's, and the two names it is easiest to confuse are
 * exactly the two a machine would.
 *
 * Matching is by name typed in rather than a list of twelve hundred: the admin
 * is reading a name off the sign-up and looking for it, which is a search, and
 * a dropdown of the whole pool costs more than the page's budget.
 */
export function SignupList({
  draftId,
  signups,
  leagues,
}: {
  draftId: number;
  signups: Signup[];
  leagues: { id: number; abbreviation: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");

  const unmatched = signups.filter((row) => !row.playerId);

  async function send(path: string, method: "DELETE" | "PATCH", body: object, id: number) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const answer = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(answer.error ?? `Request failed (${response.status})`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
    } finally {
      setBusy(0);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        Sign-ups · {signups.length}
        {unmatched.length > 0 && (
          <span className="ml-2 font-semibold normal-case tracking-normal text-amber-300">
            {unmatched.length} not matched to a player, and they cannot be drafted until they are
          </span>
        )}
      </p>
      <ul className="flex flex-col gap-1">
        {signups.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs"
          >
            <span className="min-w-[8rem] flex-1 font-semibold text-slate-200">{row.typedName}</span>
            <span className="font-bold text-slate-400">
              {leagues.find((option) => option.id === row.leagueId)?.abbreviation ?? "—"}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {row.positions?.replace(/,/g, " ") ?? ""}
            </span>
            <span className="text-slate-500">Discord: {row.discordName}</span>
            {row.playerName ? (
              <span className="font-semibold text-emerald-300">{row.playerName}</span>
            ) : (
              <>
                <MatchBox
                  busy={busy === row.id}
                  onMatch={(name) =>
                    send("/api/drafts/signup", "PATCH", { signupId: row.id, name }, row.id)
                  }
                />
                {/* For somebody who has genuinely never played here. It uses
                    the name and competition off the sign-up rather than
                    anything typed again, so the player that appears is the
                    one who asked for it. */}
                <button
                  type="button"
                  disabled={busy === row.id || !row.leagueId}
                  title={row.leagueId ? undefined : "This sign-up did not say which competition"}
                  onClick={() => {
                    if (!confirm(`Add ${row.typedName} to the site as a new player?`)) return;
                    void send(
                      "/api/drafts/signup",
                      "PATCH",
                      { signupId: row.id, create: true },
                      row.id,
                    );
                  }}
                  className="ui-button !px-2 !py-0.5 text-[11px]"
                >
                  New player
                </button>
              </>
            )}
            <button
              type="button"
              disabled={busy === row.id}
              onClick={() => {
                if (!confirm(`Take ${row.typedName} off this draft's sign-ups?`)) return;
                void send("/api/drafts/signup", "DELETE", { draftId, signupId: row.id }, row.id);
              }}
              className="ui-button !px-2 !py-0.5 text-[11px]"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

/** Type the player's name on the site, and the route finds the one row it is. */
function MatchBox({ busy, onMatch }: { busy: boolean; onMatch: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <span className="flex items-center gap-1">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Match to player…"
        aria-label="Match this sign-up to a player"
        className="ui-input !w-44 !py-0.5 text-xs"
      />
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={() => onMatch(name.trim())}
        className="ui-button !px-2 !py-0.5 text-[11px]"
      >
        Match
      </button>
    </span>
  );
}
