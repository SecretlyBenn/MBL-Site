"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * `pending` offers approve/return on a card awaiting review. `approved` offers
 * only reopen, on a game already counted on the site.
 */
export function ReviewActions({
  scorecardId,
  mode = "pending",
}: {
  scorecardId: number;
  mode?: "pending" | "approved";
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(decision: "APPROVE" | "RETURN" | "REOPEN") {
    if (
      decision === "REOPEN" &&
      !confirm(
        "Reopen this game? Its stats come off the site straight away and stay off until it is approved again.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/scorecards/${scorecardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note || undefined }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setBusy(false);
    }
  }

  if (mode === "approved") {
    return (
      <div className="space-y-2">
        <input
          className="ui-select w-full"
          placeholder="Reason (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => review("REOPEN")}
          className="rounded-md border border-rose-800 px-3 py-1.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-950/40 disabled:opacity-50"
        >
          {busy ? "Reopening…" : "Reopen for corrections"}
        </button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        className="ui-select w-full"
        placeholder="Note (required if returning)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => review("APPROVE")}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Working…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={busy || !note}
          onClick={() => review("RETURN")}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
        >
          Return with note
        </button>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
