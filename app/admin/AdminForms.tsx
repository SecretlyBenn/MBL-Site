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

/**
 * Rebuilds a season's standings and player totals from its box scores.
 *
 * Season totals and per-game stats are separate records. Approving a scorecard
 * writes both, but a season imported from the source site arrives as totals
 * first and box scores later, so the totals keep describing whatever had been
 * played when they were captured - a player shows twelve games when his box
 * scores add up to twenty-one. This recounts them from the games on record.
 */
export function RecomputeSeasonForm({ seasons }: { seasons: Team[] }) {
  const { submit, status, error } = useSubmit("/api/seasons/recompute");
  const [seasonId, setSeasonId] = useState("");
  const [done, setDone] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(null);
    const name = seasons.find((season) => String(season.id) === seasonId)?.name ?? "season";
    submit({ seasonId: Number(seasonId) }, () => setDone(`Recounted ${name}.`));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Recount season totals</h3>
      <p className="text-xs text-gray-500">
        Rebuilds standings and every player&apos;s season line from the box scores already on
        record. Safe to run at any time - it only recounts what is there.
      </p>
      <select
        className="w-full rounded border p-2 text-sm"
        value={seasonId}
        onChange={(event) => setSeasonId(event.target.value)}
        required
      >
        <option value="">Choose a season</option>
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={status === "saving" || !seasonId}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "saving" ? "Recounting..." : "Recount"}
      </button>
      {done && <p className="text-xs text-green-700">{done}</p>}
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

/**
 * Retires a fixture the season never reached.
 *
 * A best-of-three publishes three games and stops at two wins, so the last one
 * is real - it was scheduled - but was never played. Deleting it would lose the
 * fact that it was scheduled; leaving it alone shows it as upcoming forever.
 */
export function RetireFixtureForm({
  fixtures,
}: {
  fixtures: { id: number; label: string; retired: boolean }[];
}) {
  const { submit, status, error } = useSubmit("/api/fixtures/status");
  const [fixtureId, setFixtureId] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const chosen = fixtures.find((fixture) => String(fixture.id) === fixtureId);
  const restoring = chosen?.retired ?? false;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(null);
    submit({ fixtureId: Number(fixtureId), status: restoring ? null : "NOT_NEEDED" }, () => {
      setDone(restoring ? "Put back in the schedule." : "Marked as not needed.");
      setFixtureId("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Game not needed</h3>
      <p className="text-xs text-gray-500">
        For a series that ended early. The game stays on the schedule marked &quot;not needed&quot;
        instead of sitting there as upcoming. Choose a retired game to put it back.
      </p>
      <select
        className="w-full rounded border p-2 text-sm"
        value={fixtureId}
        onChange={(event) => setFixtureId(event.target.value)}
        required
      >
        <option value="">Choose a game</option>
        {fixtures.map((fixture) => (
          <option key={fixture.id} value={fixture.id}>
            {fixture.retired ? "↩ " : ""}
            {fixture.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={status === "saving" || !fixtureId}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "saving" ? "Saving..." : restoring ? "Put back" : "Mark not needed"}
      </button>
      {done && <p className="text-xs text-green-700">{done}</p>}
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

/**
 * Records that a club quit a game part way through.
 *
 * A no-show forfeits 1-0 with no box score and the site recognises that shape
 * on its own. Quitting a game already in progress leaves a real score and a
 * partial box score, which is indistinguishable from an ordinary loss - so it
 * has to be recorded by hand. The inning play stopped in is shown beside it.
 */
export function MarkForfeitForm({
  games,
}: {
  games: { id: number; label: string; forfeit: boolean; note: string | null }[];
}) {
  const { submit, status, error } = useSubmit("/api/fixtures/status");
  const [gameId, setGameId] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const chosen = games.find((game) => String(game.id) === gameId);
  const clearing = chosen?.forfeit ?? false;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(null);
    submit(
      {
        fixtureId: Number(gameId),
        status: clearing ? null : "FORFEIT",
        note: clearing ? null : note.trim() || null,
      },
      () => {
        setDone(clearing ? "No longer a forfeit." : "Recorded as a forfeit.");
        setGameId("");
        setNote("");
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h3 className="font-semibold">Mark a forfeit</h3>
      <p className="text-xs text-gray-500">
        For a game a club quit while it was being played. Choose a game already marked
        &quot;forfeit&quot; to undo it.
      </p>
      <select
        className="w-full rounded border p-2 text-sm"
        value={gameId}
        onChange={(event) => setGameId(event.target.value)}
        required
      >
        <option value="">Choose a game</option>
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.forfeit ? "↩ " : ""}
            {game.label}
          </option>
        ))}
      </select>
      {!clearing && (
        <input
          className="w-full rounded border p-2 text-sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Inning play stopped in, e.g. 4th (optional)"
        />
      )}
      <button
        type="submit"
        disabled={status === "saving" || !gameId}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "saving" ? "Saving..." : clearing ? "Not a forfeit" : "Mark forfeit"}
      </button>
      {done && <p className="text-xs text-green-700">{done}</p>}
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
