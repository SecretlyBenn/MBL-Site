"use client";

import { useState } from "react";
import { describeLocalDateTime } from "@/app/datetime";
import { TeamLogo } from "@/app/TeamLogo";
import { DeleteButton, DoneText, ErrorText, FormCard, useRequest, type Option } from "./ui";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  TRIPLE_A: "Triple-A",
  FREE_AGENT: "Free agent",
  RELEASED: "Released",
};

function TeamSelect({
  teams,
  value,
  onChange,
  placeholder,
  required,
}: {
  teams: Option[];
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <select
      className="ui-select w-full"
      value={value}
      onChange={(event) => onChange(Number(event.target.value) || "")}
      required={required}
    >
      <option value="">{placeholder}</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ Teams */

export function CreateTeamForm() {
  const { send, busy, error } = useRequest();
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [color, setColor] = useState("#1f66af");

  return (
    <FormCard
      title="Add team"
      help="A new club for the league. Upload its logo from the list once it's added."
      onSubmit={async () => {
        if (await send("POST", "/api/teams", { name, abbreviation, color })) {
          setName("");
          setAbbreviation("");
        }
      }}
    >
      <input className="ui-input" placeholder="Team name, e.g. Seattle Sharks" value={name} onChange={(event) => setName(event.target.value)} required />
      <div className="flex gap-2">
        <input
          className="ui-input"
          placeholder="Abbreviation, e.g. SEA"
          maxLength={4}
          value={abbreviation}
          onChange={(event) => setAbbreviation(event.target.value)}
          required
        />
        <input
          aria-label="Team colour"
          className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-slate-700 bg-transparent"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </div>
      <button type="submit" disabled={busy} className="ui-button-primary self-start">
        {busy ? "Adding…" : "Add team"}
      </button>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/**
 * Shrinks an uploaded image to fit a 256px square before it is sent, so a
 * multi-megabyte file never reaches the server and every logo is served small.
 * Transparent padding keeps the logo's own shape.
 */
async function resizeLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const scale = Math.min(size / bitmap.width, size / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process that image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  bitmap.close();
  // WebP where the browser can encode it; Safari falls back to PNG on its own.
  return canvas.toDataURL("image/webp", 0.9);
}

/** One club: its logo, name, abbreviation and colour, editable in place. */
export function TeamRow({
  team,
  hasUpload,
}: {
  team: { id: number; name: string; abbreviation: string; color: string | null; players: number };
  hasUpload: boolean;
}) {
  const { send, busy, error, setError } = useRequest();
  const [name, setName] = useState(team.name);
  const [abbreviation, setAbbreviation] = useState(team.abbreviation);
  const [color, setColor] = useState(team.color ?? "#1f66af");
  const [note, setNote] = useState("");
  const changed = name !== team.name || abbreviation !== team.abbreviation || color !== (team.color ?? "#1f66af");

  async function upload(file: File | undefined) {
    if (!file) return;
    setNote("");
    try {
      const dataUrl = await resizeLogo(file);
      if (await send("POST", "/api/teams/logo", { teamId: team.id, dataUrl })) setNote("Logo updated.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not read that image.");
    }
  }

  return (
    <li className="ui-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-900/80">
        <TeamLogo teamName={team.name} className="h-10 w-10" />
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-[1fr_5rem_2.5rem] gap-2">
        <input aria-label="Team name" className="ui-input" value={name} onChange={(event) => setName(event.target.value)} />
        <input
          aria-label="Abbreviation"
          className="ui-input uppercase"
          maxLength={4}
          value={abbreviation}
          onChange={(event) => setAbbreviation(event.target.value)}
        />
        <input
          aria-label="Team colour"
          className="h-10 w-10 cursor-pointer rounded-md border border-slate-700 bg-transparent"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <p className="col-span-3 text-[11px] text-slate-500">
          {team.players} player{team.players === 1 ? "" : "s"}
          {changed && name !== team.name && " · renaming also renames the club in seasons still being played"}
        </p>
      </div>

      {/* A fixed width, so every row's inputs line up whichever buttons it shows. */}
      <div className="flex flex-wrap items-center gap-2 sm:w-[23rem] sm:justify-end">
        <button
          type="button"
          disabled={busy || !changed}
          onClick={async () => {
            setNote("");
            if (await send("PATCH", "/api/teams", { teamId: team.id, name, abbreviation, color })) setNote("Saved.");
          }}
          className="ui-button-primary"
        >
          Save
        </button>
        <label className="ui-button cursor-pointer">
          {hasUpload ? "Replace logo" : "Upload logo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {hasUpload && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (confirm("Remove the uploaded logo? The built-in logo, if there is one, shows again.")) {
                if (await send("DELETE", `/api/teams/logo?teamId=${team.id}`)) setNote("Uploaded logo removed.");
              }
            }}
            className="ui-button"
          >
            Remove upload
          </button>
        )}
        <DeleteButton
          url={`/api/teams?teamId=${team.id}`}
          confirmText={`Delete ${team.name}? This only works for a club with no players, games or history.`}
        />
      </div>

      <div className="sm:basis-full sm:empty:hidden">
        <DoneText>{note}</DoneText>
        <ErrorText>{error}</ErrorText>
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- Players */

export function AddPlayersForm({ teams }: { teams: Option[] }) {
  const { send, busy, error } = useRequest();
  const [usernames, setUsernames] = useState("");
  const [teamId, setTeamId] = useState<number | "">("");
  const [status, setStatus] = useState("ACTIVE");
  const [result, setResult] = useState("");

  const effectiveStatus = teamId ? status : "FREE_AGENT";

  return (
    <FormCard
      title="Add players"
      help="One Minecraft username per line - paste a whole draft class at once. Names already in the pool are skipped, and each new player's account is linked so their head shows straight away."
      onSubmit={async () => {
        setResult("");
        const data = await send<{ added: string[]; skipped: string[]; unlinked: string[] }>("POST", "/api/players/bulk", {
          usernames,
          teamId: teamId || null,
          status: effectiveStatus,
        });
        if (data) {
          const parts = [`Added ${data.added.length}.`];
          if (data.skipped.length) parts.push(`Already in the pool: ${data.skipped.join(", ")}.`);
          if (data.unlinked.length) parts.push(`No Minecraft account found for: ${data.unlinked.join(", ")} - link them below.`);
          setResult(parts.join(" "));
          setUsernames("");
        }
      }}
    >
      <textarea
        className="ui-input min-h-24 font-mono text-xs"
        placeholder={"KexKK\nDaMineyCraftKen"}
        value={usernames}
        onChange={(event) => setUsernames(event.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <TeamSelect teams={teams} value={teamId} onChange={setTeamId} placeholder="No team (free agents)" />
        <select
          className="ui-select w-full"
          value={effectiveStatus}
          disabled={!teamId}
          onChange={(event) => setStatus(event.target.value)}
        >
          {teamId ? (
            <>
              <option value="ACTIVE">Active</option>
              <option value="TRIPLE_A">Triple-A</option>
            </>
          ) : (
            <option value="FREE_AGENT">Free agent</option>
          )}
        </select>
      </div>
      <button type="submit" disabled={busy} className="ui-button-primary self-start">
        {busy ? "Adding…" : "Add players"}
      </button>
      <DoneText>{result}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/** One player in the pool: their team and status, changed in place. */
export function PlayerRow({
  player,
  teams,
}: {
  player: { id: number; displayName: string; minecraftUsername: string; teamId: number | null; status: string; linked: boolean };
  teams: Option[];
}) {
  const { send, busy, error } = useRequest();
  const [teamId, setTeamId] = useState<number | "">(player.teamId ?? "");
  const [status, setStatus] = useState(player.status);
  const changed = (teamId || null) !== player.teamId || status !== player.status;

  function pickTeam(next: number | "") {
    setTeamId(next);
    // Keep the pair consistent as the team changes.
    if (next && (status === "FREE_AGENT" || status === "RELEASED")) setStatus("ACTIVE");
    if (!next && (status === "ACTIVE" || status === "TRIPLE_A")) setStatus("FREE_AGENT");
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 py-2 last:border-0">
      <span className="min-w-40 flex-1">
        <span className="font-semibold text-slate-100">{player.displayName}</span>
        {player.minecraftUsername !== player.displayName && (
          <span className="ml-2 text-xs text-slate-500">{player.minecraftUsername}</span>
        )}
        {!player.linked && <span className="ml-2 text-[11px] font-semibold text-amber-400">no Minecraft account linked</span>}
      </span>
      <div className="w-52">
        <TeamSelect teams={teams} value={teamId} onChange={pickTeam} placeholder="No team" />
      </div>
      <select className="ui-select w-32" value={status} onChange={(event) => setStatus(event.target.value)}>
        {(teamId ? ["ACTIVE", "TRIPLE_A"] : ["FREE_AGENT", "RELEASED"]).map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || !changed}
        onClick={() => void send("PATCH", "/api/players", { playerId: player.id, teamId: teamId || null, status })}
        className="ui-button-primary"
      >
        Save
      </button>
      <DeleteButton
        url={`/api/players?playerId=${player.id}`}
        confirmText={`Delete ${player.displayName}? Only works for a player who has never been in a scored game - otherwise release them.`}
      />
      {error && <p role="alert" className="w-full text-xs text-rose-400">{error}</p>}
    </li>
  );
}

/**
 * Renames a player everywhere at once.
 *
 * Players here rename their Minecraft accounts often, and the archive keys a
 * career by name across six tables rather than by an id - so a rename done in
 * one place quietly splits a career in two and drops the player's head. This
 * does all six or refuses, and says afterwards how much moved.
 */
export function RenamePlayerForm() {
  const { send, busy, error } = useRequest();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [done, setDone] = useState("");

  return (
    <FormCard
      title="Rename a player"
      help="Changes the name on their profile, every season and game line, their roster entries and their skin link. Their stats and head come with them."
      onSubmit={async () => {
        setDone("");
        if (await send("POST", "/api/players/rename", { from, to })) {
          setDone(`${from} is now ${to}.`);
          setFrom("");
          setTo("");
        }
      }}
    >
      <input className="ui-input" placeholder="Current name" list="admin-player-names" value={from} onChange={(event) => setFrom(event.target.value)} required />
      <input className="ui-input" placeholder="New name" value={to} onChange={(event) => setTo(event.target.value)} required />
      <button type="submit" disabled={busy} className="ui-button-primary self-start">
        {busy ? "Renaming…" : "Rename"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/**
 * Points a name on the site at the Minecraft account the player uses now.
 * From then on their head follows that account through renames and skin
 * changes on its own.
 */
export function LinkAccountForm({ initialName = "" }: { initialName?: string }) {
  const { send, busy, error } = useRequest();
  const [playerName, setPlayerName] = useState(initialName);
  const [minecraftName, setMinecraftName] = useState("");
  const [done, setDone] = useState("");

  return (
    <FormCard
      title="Link a Minecraft account"
      help="For a player with a blank head, or someone else's. Enter the name the site shows and the name they use in Minecraft today."
      onSubmit={async () => {
        setDone("");
        const data = await send<{ account: { name: string } }>("POST", "/api/players/account", { playerName, minecraftName });
        if (data) {
          setDone(`${playerName} now shows ${data.account.name}'s skin.`);
          setPlayerName("");
          setMinecraftName("");
        }
      }}
    >
      <input className="ui-input" placeholder="Name on the site" list="admin-player-names" value={playerName} onChange={(event) => setPlayerName(event.target.value)} required />
      <input className="ui-input" placeholder="Current Minecraft username" value={minecraftName} onChange={(event) => setMinecraftName(event.target.value)} required />
      <button type="submit" disabled={busy} className="ui-button-primary self-start">
        {busy ? "Looking up…" : "Link account"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/** A one-click link for a player listed as missing an account. */
export function QuickLinkRow({ name }: { name: string }) {
  const { send, busy, error } = useRequest();
  const [minecraftName, setMinecraftName] = useState(name);
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 py-2 last:border-0">
      <span className="min-w-40 flex-1 font-semibold text-slate-100">{name}</span>
      <input
        aria-label={`Current Minecraft username for ${name}`}
        className="ui-input w-52"
        value={minecraftName}
        onChange={(event) => setMinecraftName(event.target.value)}
      />
      <button
        type="button"
        disabled={busy || !minecraftName.trim()}
        onClick={() => void send("POST", "/api/players/account", { playerName: name, minecraftName })}
        className="ui-button-primary"
      >
        {busy ? "…" : "Link"}
      </button>
      {error && <p role="alert" className="w-full text-xs text-rose-400">{error}</p>}
    </li>
  );
}

/* ------------------------------------------------------------------ Games */

export function ScheduleGameForm({ teams }: { teams: Option[] }) {
  const { send, busy, error } = useRequest();
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [scheduledAt, setScheduledAt] = useState("");

  return (
    <FormCard
      title="One-off game"
      help="A game that isn't a fixture in any season - an exhibition, say. Season games are scheduled from the schedule page."
      onSubmit={async () => {
        if (await send("POST", "/api/games", { awayTeamId, homeTeamId, scheduledAt: new Date(scheduledAt).toISOString() })) {
          setScheduledAt("");
        }
      }}
    >
      <TeamSelect teams={teams} value={awayTeamId} onChange={setAwayTeamId} placeholder="Away team" required />
      <TeamSelect teams={teams} value={homeTeamId} onChange={setHomeTeamId} placeholder="Home team" required />
      <input className="ui-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
      {describeLocalDateTime(scheduledAt) && <p className="text-xs font-medium text-slate-300">{describeLocalDateTime(scheduledAt)}</p>}
      <button type="submit" disabled={busy || !awayTeamId || awayTeamId === homeTeamId} className="ui-button-primary self-start">
        {busy ? "Scheduling…" : "Schedule game"}
      </button>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/** Adds a matchup - or a whole series of them - to a season's schedule. */
export function AddFixtureForm({ seasonId, seasonName, teams }: { seasonId: number; seasonName: string; teams: Option[] }) {
  const { send, busy, error } = useRequest();
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [count, setCount] = useState(3);
  const [playedOn, setPlayedOn] = useState("");
  const [done, setDone] = useState("");

  return (
    <FormCard
      title={`Add to ${seasonName}`}
      help="A series is several games between the same clubs; home and away alternate, starting with the home club you pick. Clubs then set times for each game from the schedule page."
      onSubmit={async () => {
        setDone("");
        const data = await send<{ created: number }>("POST", "/api/fixtures", { seasonId, awayTeamId, homeTeamId, count, playedOn });
        if (data) setDone(`Added ${data.created} game${data.created === 1 ? "" : "s"}.`);
      }}
    >
      <TeamSelect teams={teams} value={awayTeamId} onChange={setAwayTeamId} placeholder="Away team" required />
      <TeamSelect teams={teams} value={homeTeamId} onChange={setHomeTeamId} placeholder="Home team" required />
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Games
          <input className="ui-input" type="number" min={1} max={9} value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Date label (optional)
          <input className="ui-input" placeholder="e.g. September 4 - September 14" value={playedOn} onChange={(event) => setPlayedOn(event.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={busy || !awayTeamId || awayTeamId === homeTeamId} className="ui-button-primary self-start">
        {busy ? "Adding…" : count > 1 ? `Add ${count}-game series` : "Add game"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/**
 * Retires a fixture the season never reached.
 *
 * A best-of-three publishes three games and stops at two wins, so the last one
 * is real - it was scheduled - but was never played. Deleting it would lose the
 * fact that it was scheduled; leaving it alone shows it as upcoming forever.
 */
export function RetireFixtureForm({ fixtures }: { fixtures: { id: number; label: string; retired: boolean }[] }) {
  const { send, busy, error } = useRequest();
  const [fixtureId, setFixtureId] = useState("");
  const [done, setDone] = useState("");
  const restoring = fixtures.find((fixture) => String(fixture.id) === fixtureId)?.retired ?? false;

  return (
    <FormCard
      title="Game not needed"
      help='For a series that ended early. The game stays on the schedule marked "not needed" instead of showing as upcoming. Choose a retired game (↩) to put it back.'
      onSubmit={async () => {
        setDone("");
        if (await send("POST", "/api/fixtures/status", { fixtureId: Number(fixtureId), status: restoring ? null : "NOT_NEEDED" })) {
          setDone(restoring ? "Put back in the schedule." : "Marked as not needed.");
          setFixtureId("");
        }
      }}
    >
      <select className="ui-select w-full" value={fixtureId} onChange={(event) => setFixtureId(event.target.value)} required>
        <option value="">{fixtures.length ? "Choose a game" : "No unplayed games in this season"}</option>
        {fixtures.map((fixture) => (
          <option key={fixture.id} value={fixture.id}>
            {fixture.retired ? "↩ " : ""}
            {fixture.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={busy || !fixtureId} className="ui-button-primary self-start">
        {busy ? "Saving…" : restoring ? "Put back" : "Mark not needed"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
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
export function MarkForfeitForm({ games }: { games: { id: number; label: string; forfeit: boolean }[] }) {
  const { send, busy, error } = useRequest();
  const [gameId, setGameId] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const clearing = games.find((game) => String(game.id) === gameId)?.forfeit ?? false;

  return (
    <FormCard
      title="Mark a forfeit"
      help="For a game a club quit while it was being played. Choose a game already marked forfeit (↩) to undo it."
      onSubmit={async () => {
        setDone("");
        if (
          await send("POST", "/api/fixtures/status", {
            fixtureId: Number(gameId),
            status: clearing ? null : "FORFEIT",
            note: clearing ? null : note.trim() || null,
          })
        ) {
          setDone(clearing ? "No longer a forfeit." : "Recorded as a forfeit.");
          setGameId("");
          setNote("");
        }
      }}
    >
      <select className="ui-select w-full" value={gameId} onChange={(event) => setGameId(event.target.value)} required>
        <option value="">{games.length ? "Choose a game" : "No played games in this season"}</option>
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.forfeit ? "↩ " : ""}
            {game.label}
          </option>
        ))}
      </select>
      {!clearing && (
        <input className="ui-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Inning play stopped in, e.g. 4th (optional)" />
      )}
      <button type="submit" disabled={busy || !gameId} className="ui-button-primary self-start">
        {busy ? "Saving…" : clearing ? "Not a forfeit" : "Mark forfeit"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/* ---------------------------------------------------------------- Seasons */

export function CreateSeasonForm() {
  const { send, busy, error } = useRequest();
  const [name, setName] = useState("");
  const [done, setDone] = useState("");

  return (
    <FormCard
      title="Start a season"
      help="Creates the season after every existing one, so the schedule, standings and stats pages open on it. Every current club is entered at 0-0. Add its games from the Games tab."
      onSubmit={async () => {
        setDone("");
        const data = await send<{ teams: number }>("POST", "/api/seasons", { name });
        if (data) {
          setDone(`${name} created with ${data.teams} teams.`);
          setName("");
        }
      }}
    >
      <input className="ui-input" placeholder="e.g. MBL Season XIII, or MBL Season XIII Playoffs" value={name} onChange={(event) => setName(event.target.value)} required />
      <button type="submit" disabled={busy} className="ui-button-primary self-start">
        {busy ? "Creating…" : "Create season"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/**
 * Rebuilds a season's standings and player totals from its box scores.
 *
 * Season totals and per-game stats are separate records. Approving a scorecard
 * writes both, but a season imported from the source site arrives as totals
 * first and box scores later, so the totals keep describing whatever had been
 * played when they were captured. This recounts them from the games on record.
 */
export function RecomputeSeasonForm({ seasons }: { seasons: Option[] }) {
  const { send, busy, error } = useRequest();
  const [seasonId, setSeasonId] = useState("");
  const [done, setDone] = useState("");

  return (
    <FormCard
      title="Recount season totals"
      help="Rebuilds standings and every player's season line from the box scores on record. Safe to run any time."
      onSubmit={async () => {
        setDone("");
        const name = seasons.find((season) => String(season.id) === seasonId)?.name ?? "season";
        if (await send("POST", "/api/seasons/recompute", { seasonId: Number(seasonId) })) setDone(`Recounted ${name}.`);
      }}
    >
      <select className="ui-select w-full" value={seasonId} onChange={(event) => setSeasonId(event.target.value)} required>
        <option value="">Choose a season</option>
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={busy || !seasonId} className="ui-button-primary self-start">
        {busy ? "Recounting…" : "Recount"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

export function CurrentSeasonForm({ seasons, current }: { seasons: Option[]; current: string }) {
  const { send, busy, error } = useRequest();
  const [seasonId, setSeasonId] = useState(
    String(seasons.find((season) => season.name === current)?.id ?? ""),
  );
  const [done, setDone] = useState("");

  return (
    <FormCard
      title="Season being played"
      help={
        <>
          Currently <strong className="text-slate-200">{current}</strong>. A game already on a
          published schedule keeps its own season; this is where a game added here goes, and the
          schedule the umpire page numbers series from. Change it when a new season or its playoffs
          begin.
        </>
      }
      onSubmit={async () => {
        setDone("");
        const name = seasons.find((season) => String(season.id) === seasonId)?.name ?? "season";
        if (await send("PATCH", "/api/seasons", { seasonId: Number(seasonId) })) {
          setDone(`Now playing ${name}.`);
        }
      }}
    >
      <select className="ui-select w-full" value={seasonId} onChange={(event) => setSeasonId(event.target.value)} required>
        <option value="">Choose a season</option>
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={busy || !seasonId} className="ui-button-primary self-start">
        {busy ? "Saving…" : "Set season"}
      </button>
      <DoneText>{done}</DoneText>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}

/* --------------------------------------------------------------- Accounts */

export function CreateUserForm({ teams }: { teams: Option[] }) {
  const { send, busy, error } = useRequest();
  const [discordId, setDiscordId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("UMPIRE");
  const [teamId, setTeamId] = useState<number | "">("");

  return (
    <FormCard
      title="Add league account"
      help="Signing in with Discord grants nothing on its own - someone can only reach a portal once they have an account here."
      onSubmit={async () => {
        if (await send("POST", "/api/users", { discordId, displayName, role, teamId: role === "GM" ? teamId : undefined })) {
          setDiscordId("");
          setDisplayName("");
        }
      }}
    >
      <input className="ui-input" placeholder="Discord user ID (18-19 digits)" inputMode="numeric" value={discordId} onChange={(event) => setDiscordId(event.target.value)} required />
      <input className="ui-input" placeholder="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
      <select className="ui-select w-full" value={role} onChange={(event) => setRole(event.target.value)}>
        <option value="UMPIRE">Umpire</option>
        <option value="HEAD_UMPIRE">Head umpire</option>
        <option value="GM">General manager</option>
        <option value="ADMIN">Admin</option>
      </select>
      {role === "GM" && <TeamSelect teams={teams} value={teamId} onChange={setTeamId} placeholder="Team they manage" required />}
      <button type="submit" disabled={busy} className="ui-button-primary self-start">
        {busy ? "Adding…" : "Add account"}
      </button>
      <ErrorText>{error}</ErrorText>
    </FormCard>
  );
}
