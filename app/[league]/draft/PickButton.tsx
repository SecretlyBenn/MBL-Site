"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Takes a player with the pick on the clock.
 *
 * It asks first. A pick cannot be taken back by the person who made it - only
 * an admin can undo one - and the usual way to draft the wrong man is to click
 * the row above the one you meant.
 */
export function PickButton({
  draftId,
  playerId,
  playerName,
  teamName,
}: {
  draftId: number;
  playerId: number;
  playerName: string;
  teamName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick() {
    if (!confirm(`Draft ${playerName} to ${teamName}?`)) return;
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
    }
  }

  return (
    <span className="flex items-center gap-2">
      {error && <span role="alert" className="text-xs text-rose-400">{error}</span>}
      <button type="button" onClick={pick} disabled={busy} className="ui-button-primary !px-3 !py-1 text-xs">
        {busy ? "Drafting…" : "Draft"}
      </button>
    </span>
  );
}
