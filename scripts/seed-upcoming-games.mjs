// Puts the remaining Season XII fixtures into the live `games` table so umpires
// score real scheduled games rather than inventing them.
//
// Each live row keeps the archive's game id in `source_game_id`, so publishing
// an approved scorecard fills in the unplayed historical row instead of adding
// a duplicate beside it. That link is also what makes this script safe to run
// twice: a fixture already seeded is skipped.
//
//   node scripts/seed-upcoming-games.mjs [--local]

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LOCAL = process.argv.includes("--local");
const DB = "mbl-site-db";
const SEASON = "MBL Season XII";

// SELECTs have to go through --command; --file reports only a summary. The
// statement is flattened to one line first, because a newline inside a shell
// argument truncates it and wrangler then reports no command at all.
function d1(sql) {
  const output = execFileSync(
    "npx",
    [
      "wrangler", "d1", "execute", DB, LOCAL ? "--local" : "--remote", "--json",
      "--command", `"${sql.replace(/\s+/g, " ").trim().replace(/"/g, '\\"')}"`,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: true },
  );
  // wrangler prefixes the JSON with banner lines on some versions.
  const start = output.indexOf("[");
  return JSON.parse(output.slice(start))[0].results;
}

const MONTHS = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};

/** "Monday July 27, 2026" + "12:00 PM" -> "2026-07-27T12:00". */
function scheduledAt(playedOn, startTime) {
  const match = /([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(playedOn ?? "");
  if (!match) return null;
  const [, month, day, year] = match;
  if (!MONTHS[month]) return null;

  let hour = 12;
  let minute = "00";
  const time = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(startTime ?? "");
  if (time) {
    hour = Number(time[1]) % 12;
    minute = time[2];
    if (time[3].toUpperCase() === "PM") hour += 12;
  }
  return `${year}-${MONTHS[month]}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}`;
}

const quote = (value) => (value === null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

const fixtures = d1(`
  SELECT g.id, g.source_game_id, g.played_on, g.start_time,
         ht_away.name AS away_name, ht_home.name AS home_name
  FROM historical_games g
  JOIN historical_seasons s ON s.id = g.season_id
  LEFT JOIN historical_teams ht_away ON ht_away.id = g.away_team_id
  LEFT JOIN historical_teams ht_home ON ht_home.id = g.home_team_id
  WHERE s.name = ${quote(SEASON)} AND g.home_score IS NULL
  ORDER BY g.sort_order
`);

const liveTeams = d1("SELECT id, name FROM teams");
const teamId = new Map(liveTeams.map((team) => [team.name, team.id]));

const already = new Set(
  d1("SELECT source_game_id FROM games WHERE source_game_id IS NOT NULL")
    .map((row) => row.source_game_id),
);

const statements = [];
const skipped = [];

for (const fixture of fixtures) {
  // The archive id is the identity that survives re-runs; a fixture without one
  // cannot be linked back, so it is reported rather than guessed at.
  const key = fixture.source_game_id;
  if (!key) {
    skipped.push(`${fixture.away_name} at ${fixture.home_name} - no archive id`);
    continue;
  }
  if (already.has(key)) continue;

  const home = teamId.get(fixture.home_name);
  const away = teamId.get(fixture.away_name);
  if (!home || !away) {
    skipped.push(`${fixture.away_name} at ${fixture.home_name} - team not in the live league`);
    continue;
  }

  const when = scheduledAt(fixture.played_on, fixture.start_time);
  if (!when) {
    skipped.push(`${fixture.away_name} at ${fixture.home_name} - unreadable date "${fixture.played_on}"`);
    continue;
  }

  statements.push(
    `INSERT INTO games (home_team_id, away_team_id, scheduled_at, status, source_game_id) ` +
      `VALUES (${home}, ${away}, ${quote(when)}, 'SCHEDULED', ${quote(key)});`,
  );
}

for (const line of skipped) console.log(`skipped: ${line}`);

if (statements.length === 0) {
  console.log("Nothing to seed - every fixture is already in the live schedule.");
  process.exit(0);
}

const file = join(tmpdir(), "seed-upcoming-games.sql");
writeFileSync(file, statements.join("\n"), "utf8");

execFileSync(
  "npx",
  ["wrangler", "d1", "execute", DB, LOCAL ? "--local" : "--remote", "--file", file, "-y"],
  { stdio: "inherit", shell: true },
);

console.log(`Seeded ${statements.length} upcoming ${SEASON} games.`);
