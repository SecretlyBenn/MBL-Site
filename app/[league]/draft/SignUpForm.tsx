"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Putting your name down for a draft.
 *
 * The only thing on this site a player does for themselves, so it asks for a
 * Discord account and nothing else. The name is theirs in game, because that
 * is the only thing this site and the roster bot have ever had in common - and
 * it is shown back to them matched or unmatched, so somebody who has typed it
 * wrong finds out now rather than on draft night.
 */
export function SignUpForm({
  draftId,
  discordName,
  signedUpAs,
  matchedAs,
}: {
  draftId: number;
  discordName: string;
  /** The name already put down, if they have signed up. */
  signedUpAs?: string;
  /** The player that name matched, if it matched one. */
  matchedAs?: string | null;
}) {
  const router = useRouter();
  // Discord nicknames have matched names in game since Season VII, so this is
  // usually already right and they only have to press the button.
  const [name, setName] = useState(signedUpAs ?? discordName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [said, setSaid] = useState("");

  async function send(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Take your name off this draft?")) return;
    setBusy(true);
    setError("");
    setSaid("");
    try {
      const response = await fetch("/api/drafts/signup", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, name }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        matched?: string | null;
      };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      if (method === "POST") {
        setSaid(
          body.matched
            ? `You are down as ${body.matched}.`
            : "You are down. We do not have that name on file yet, so an admin will match it up.",
        );
      }
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Your name in game
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          placeholder="Steve"
          className="ui-input font-normal normal-case tracking-normal"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => send("POST")}
          disabled={busy || !name.trim()}
          className="ui-button-primary"
        >
          {busy ? "Saving…" : signedUpAs ? "Change my name" : "Sign me up"}
        </button>
        {signedUpAs && (
          <button type="button" onClick={() => send("DELETE")} disabled={busy} className="ui-button">
            Withdraw
          </button>
        )}
      </div>
      {signedUpAs && !said && (
        <p className="text-xs text-slate-400">
          You are signed up as <span className="font-semibold text-slate-200">{signedUpAs}</span>
          {matchedAs ? (
            <>
              , matched to <span className="font-semibold text-emerald-300">{matchedAs}</span>.
            </>
          ) : (
            <>. We do not have that name on file yet — an admin will match it up.</>
          )}
        </p>
      )}
      {said && <p className="text-xs text-emerald-300">{said}</p>}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
