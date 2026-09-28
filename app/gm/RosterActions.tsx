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
        className={className ?? "ui-button"}
      >
        {busy ? "..." : label}
      </button>
      {error && <span role="alert" className="text-xs text-rose-400">{error}</span>}
    </span>
  );
}

/**
 * Adds a player who has never been on the site.
 *
 * A GM could only ever sign from the free-agent pool, so somebody joining the
 * league for the first time - which is most of a college intake - had to go
 * through an admin. This puts them straight onto the GM's own club; the API
 * will not let it be any other.
 */
export function AddPlayerButton({ teamName }: { teamName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function add() {
    const minecraftUsername = name.trim();
    if (!minecraftUsername) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minecraftUsername }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      setDone(`${minecraftUsername} added to ${teamName}.`);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          className="ui-input min-w-0 flex-1"
          placeholder="Minecraft username"
          aria-label="Minecraft username of the player to add"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void add(); }}
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || name.trim() === ""}
          className="ui-button-primary"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {done && <p className="text-xs font-medium text-emerald-400">{done}</p>}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
