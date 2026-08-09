/**
 * Seeds the live league tables from the most recent archived season.
 *
 *   node scripts/seed-live-league.mjs [--sql out.sql]
 *
 * The archive is read-only history; the live tables are what the umpire portal
 * and roster moves operate on. This gives them a starting point - the teams and
 * rosters as the last archived season ended - rather than an empty database.
 *
 * Re-running is safe: rows are matched on their natural key.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const D1_DIR = path.join(".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const dbFile = fs
  .readdirSync(D1_DIR)
  .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
  .map((name) => path.join(D1_DIR, name))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const db = new DatabaseSync(dbFile);
const sqlOut = process.argv.includes("--sql");
const statements = [];
const esc = (value) =>
  value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

// Highest sort_order is the most recent season - the archive counts upward,
// so Season IV is 1 and the newest season is last.
const season = db
  .prepare("SELECT id, name FROM historical_seasons ORDER BY sort_order DESC LIMIT 1")
  .get();
const teams = db
  .prepare("SELECT id, name, abbreviation FROM historical_teams WHERE season_id = ? ORDER BY name")
  .all(season.id);

const insertTeam = db.prepare(
  "INSERT INTO teams (name, abbreviation) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET abbreviation = excluded.abbreviation RETURNING id",
);
const insertPlayer = db.prepare(
  "INSERT INTO players (minecraft_username, display_name, team_id, status) VALUES (?, ?, ?, 'ACTIVE') ON CONFLICT(minecraft_username) DO UPDATE SET team_id = excluded.team_id, status = 'ACTIVE' RETURNING id",
);
const rosterOf = db.prepare(
  "SELECT DISTINCT player_name FROM historical_roster_entries WHERE historical_team_id = ? ORDER BY player_name",
);
// Roster entries can be thin for a season; anyone who recorded a stat line for
// the team belongs on it too.
const playedFor = db.prepare(
  "SELECT DISTINCT player_name FROM historical_player_stats WHERE historical_team_id = ? ORDER BY player_name",
);

let teamCount = 0;
let playerCount = 0;

for (const team of teams) {
  const { id: teamId } = insertTeam.get(team.name, team.abbreviation ?? team.name.slice(0, 3).toUpperCase());
  teamCount += 1;
  statements.push(
    `INSERT INTO teams (name, abbreviation) VALUES (${esc(team.name)}, ${esc(team.abbreviation)}) ON CONFLICT(name) DO UPDATE SET abbreviation = excluded.abbreviation;`,
  );

  const names = new Set([
    ...rosterOf.all(team.id).map((row) => row.player_name),
    ...playedFor.all(team.id).map((row) => row.player_name),
  ]);

  for (const name of names) {
    if (!name || /^totals?$/i.test(name)) continue;
    insertPlayer.run(name, name, teamId);
    playerCount += 1;
    statements.push(
      `INSERT INTO players (minecraft_username, display_name, team_id, status) SELECT ${esc(name)}, ${esc(name)}, id, 'ACTIVE' FROM teams WHERE name = ${esc(team.name)} ON CONFLICT(minecraft_username) DO UPDATE SET team_id = excluded.team_id, status = 'ACTIVE';`,
    );
  }
}

if (sqlOut) {
  fs.mkdirSync("dist", { recursive: true });
  fs.writeFileSync("dist/seed-live-league.sql", statements.join("\n"), "utf8");
  console.log("Wrote dist/seed-live-league.sql");
}
console.log(`Seeded from ${season.name}: ${teamCount} teams, ${playerCount} players`);
