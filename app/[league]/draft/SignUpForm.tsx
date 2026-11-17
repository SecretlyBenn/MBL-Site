"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POSITIONS } from "@/app/scoring";

/**
 * Putting your name down for a draft.
 *
 * The only thing on this site a player does for themselves, so it asks for a
 * Discord account and nothing else. One sign-up each: the row is found by the
 * Discord id on the cookie, so coming back changes the one you have rather
 * than adding another, and nobody can put themselves in twice to get drafted
 * twice.
 *
 * It asks three things. The name, because that is the only thing this site and
 * the roster bot have ever had in common - and it is shown back matched or
 * unmatched, so somebody who typed it wrong finds out now rather than on
 * draft night. The competition, because the people this is for are the ones
 * who have never played here and have no row to read it off. And what they can
 * play, because a general manager drafting a stranger has nothing else to go
 * on.
 */
export function SignUpForm({
  draftId,
  discordName,
  leagues,
  signedUpAs,
  matchedAs,
  signedUpLeague,
  signedUpPositions,
}: {
  draftId: number;
  discordName: string;
  /** The competitions somebody can sign up out of; never the tournament. */
  leagues: { id: number; name: string; abbreviation: string }[];
  signedUpAs?: string;
  matchedAs?: string | null;
  signedUpLeague?: number | null;
  signedUpPositions?: string | null;
}) {
  const router = useRouter();
  // Discord nicknames have matched names in game since Season VII, so this is
  // usually already right and they only have to press the button.
  const [name, setName] = useState(signedUpAs ?? discordName);
  const [leagueId, setLeagueId] = useState<number | "">(signedUpLeague ?? "");
  const [played, setPlayed] = useState<string[]>(
    signedUpPositions ? signedUpPositions.split(",").filter(Boolean) : [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [said, setSaid] = useState("");

  const toggle = (position: string) =>
    setPlayed((held) =>
      held.includes(position) ? held.filter((other) => other !== position) : [...held, position],
    );

  async function send(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Take your name off this draft?")) return;
    setBusy(true);
    setError("");
    setSaid("");
    try {
      const response = await fetch("/api/drafts/signup", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, name, leagueId: leagueId || undefined, positions: played }),
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Your name in game
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="Steve"
            className="ui-input font-normal normal-case tracking-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          You play in
          <select
            value={leagueId}
            onChange={(event) => setLeagueId(Number(event.target.value) || "")}
            className="ui-select font-normal normal-case tracking-normal"
          >
            <option value="">Pick one…</option>
            {leagues.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Positions you can play
        </span>
        <span className="flex flex-wrap gap-1.5">
          {POSITIONS.map((position) => (
            <label
              key={position}
              className={`cursor-pointer select-none rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${
                played.includes(position)
                  ? "border-sky-500 bg-sky-600/20 text-sky-200"
                  : "border-slate-700 text-slate-500 hover:border-slate-600"
              }`}
            >
              <input
                type="checkbox"
                checked={played.includes(position)}
                onChange={() => toggle(position)}
                className="sr-only"
              />
              {position}
            </label>
          ))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => send("POST")}
          disabled={busy || !name.trim() || !leagueId || played.length === 0}
          className="ui-button-primary"
        >
          {busy ? "Saving…" : signedUpAs ? "Save my changes" : "Sign me up"}
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
          )}{" "}
          This is your one sign-up for this draft; changing it here changes that, it does not add
          another.
        </p>
      )}
      {said && <p className="text-xs text-emerald-300">{said}</p>}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
