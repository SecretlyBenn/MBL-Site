"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewActions({ scorecardId }: { scorecardId: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(decision: "APPROVE" | "RETURN") {
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

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Note (required if returning)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => review("APPROVE")}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy || !note}
          onClick={() => review("RETURN")}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Return with note
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
