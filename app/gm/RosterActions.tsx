"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RosterActionButton({
  playerId,
  moveType,
  teamId,
  label,
  className,
}: {
  playerId: number;
  moveType: "SIGN" | "RELEASE" | "SEND_DOWN" | "RECALL";
  teamId?: number;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/roster-moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, moveType, teamId }),
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
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={act}
        className={className ?? "rounded bg-gray-800 px-2 py-1 text-xs text-white disabled:opacity-50"}
      >
        {busy ? "..." : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
