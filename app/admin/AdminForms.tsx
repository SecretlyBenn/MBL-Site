"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Team = { id: number; name: string };
type RoleOption = "ADMIN" | "HEAD_UMPIRE" | "UMPIRE" | "GM";

function useSubmit(path: string) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(body: unknown, onDone?: () => void) {
    setStatus("saving");
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }
      setStatus("idle");
      onDone?.();
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  return { submit, status, error };
}

/**
 * Renames a player everywhere at once.
 *
 * Players here rename their Minecraft accounts often, and the archive keys a
 * career by name across six tables rather than by an id - so a rename done in
 * one place quietly splits a career in two and drops the player's head. This
 * does all six or refuses, and says afterwards how much moved.
 */
export function RenamePlayerForm({ names }: { names: string[] }) {
  const { submit, status, error } = useSubmit("/api/players/rename");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [done, setDone] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(null);
    submit({ from, to }, () => {
      setDone(`${from} is now ${to}.`);
      setFrom("");
      setTo("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Rename player</h3>
      <p className="text-xs text-gray-500">
        Changes the name on their profile, every season and game line, their roster entries and
        their skin. Their stats and their head come with them.
      </p>
      {/* Free text with suggestions rather than a plain menu: plenty of names
          on the site have no row in the current player pool - anyone who has
          not played since the archive was imported - and they can be renamed
          too. */}
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Current name"
        list="rename-player-names"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
        required
      />
      <datalist id="rename-player-names">
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="New name"
        value={to}
        onChange={(event) => setTo(event.target.value)}
        required
      />
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "saving" ? "Renaming..." : "Rename"}
      </button>
      {done && <p className="text-sm text-green-600">{done}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function CreateTeamForm() {
  const { submit, status, error } = useSubmit("/api/teams");
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [color, setColor] = useState("#1f66af");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit({ name, abbreviation, color }, () => {
      setName("");
      setAbbreviation("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Add team</h3>
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Team name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Abbreviation (e.g. RIP)"
        value={abbreviation}
        onChange={(event) => setAbbreviation(event.target.value)}
        required
      />
      <input
        className="h-9 w-full rounded border"
        type="color"
        value={color}
        onChange={(event) => setColor(event.target.value)}
      />
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        Add team
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function CreatePlayerForm() {
  const { submit, status, error } = useSubmit("/api/players");
  const [minecraftUsername, setMinecraftUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit({ minecraftUsername, displayName }, () => {
      setMinecraftUsername("");
      setDisplayName("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Add player to pool</h3>
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Minecraft username"
        value={minecraftUsername}
        onChange={(event) => setMinecraftUsername(event.target.value)}
        required
      />
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Display name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        required
      />
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        Add player
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function CreateUserForm({ teams }: { teams: Team[] }) {
  const { submit, status, error } = useSubmit("/api/users");
  const [discordId, setDiscordId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<RoleOption>("UMPIRE");
  const [teamId, setTeamId] = useState<number | "">("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(
      { discordId, displayName, role, teamId: role === "GM" ? teamId : undefined },
      () => {
        setDiscordId("");
        setDisplayName("");
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Add league account</h3>
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Discord user ID (18-19 digits)"
        inputMode="numeric"
        value={discordId}
        onChange={(event) => setDiscordId(event.target.value)}
        required
      />
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Display name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        required
      />
      <select
        className="w-full rounded border p-2 text-sm"
        value={role}
        onChange={(event) => setRole(event.target.value as RoleOption)}
      >
        <option value="UMPIRE">Umpire</option>
        <option value="HEAD_UMPIRE">Head umpire</option>
        <option value="GM">General manager</option>
        <option value="ADMIN">Admin</option>
      </select>
      {role === "GM" && (
        <select
          className="w-full rounded border p-2 text-sm"
          value={teamId}
          onChange={(event) => setTeamId(Number(event.target.value))}
          required
        >
          <option value="">Select team...</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        Add account
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function ScheduleGameForm({ teams }: { teams: Team[] }) {
  const { submit, status, error } = useSubmit("/api/games");
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [scheduledAt, setScheduledAt] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(
      { homeTeamId, awayTeamId, scheduledAt: new Date(scheduledAt).toISOString() },
      () => setScheduledAt(""),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Schedule a game</h3>
      <select
        className="w-full rounded border p-2 text-sm"
        value={awayTeamId}
        onChange={(event) => setAwayTeamId(Number(event.target.value))}
        required
      >
        <option value="">Away team...</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <select
        className="w-full rounded border p-2 text-sm"
        value={homeTeamId}
        onChange={(event) => setHomeTeamId(Number(event.target.value))}
        required
      >
        <option value="">Home team...</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <input
        className="w-full rounded border p-2 text-sm"
        type="datetime-local"
        value={scheduledAt}
        onChange={(event) => setScheduledAt(event.target.value)}
        required
      />
      <button
        type="submit"
        disabled={status === "saving" || homeTeamId === awayTeamId}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        Schedule game
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
