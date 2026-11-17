"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Takes a player with the pick on the clock.
 *
 * It asks twice, and the second press is a different button in a different
 * place with the name on it. A browser's own confirm box is one return key
 * away from being agreed to by somebody who was typing, and a pick cannot be
 * taken back by the person who made it - only an admin can undo one. The
 * usual way to draft the wrong man is to click the row above the one you
 * meant, which a dialog that says "are you sure?" does nothing about and one
 * that says "Draft Steve?" does.
 */
export function PickButton({
  draftId,
  playerId,
  playerName,
  teamName,
  onBehalf,
}: {
  draftId: number;
  playerId: number;
  playerName: string;
  teamName: string;
  /** True when an admin is picking for a club that is not theirs. */
  onBehalf?: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/drafts/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, playerId }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
      setBusy(false);
      setAsking(false);
    }
  }

  if (asking) {
    return (
      <span className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs font-semibold text-amber-300">
          {onBehalf ? `Draft to ${teamName} for them?` : `Draft to ${teamName}?`}
        </span>
        <button
          type="button"
          onClick={() => setAsking(false)}
          disabled={busy}
          className="ui-button !px-2.5 !py-1 text-xs"
        >
          No
        </button>
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          autoFocus
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Drafting…" : `Yes, draft ${playerName}`}
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {error && <span role="alert" className="text-xs text-rose-400">{error}</span>}
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="ui-button-primary !px-3 !py-1 text-xs"
      >
        Draft
      </button>
    </span>
  );
}
