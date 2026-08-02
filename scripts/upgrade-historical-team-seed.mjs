import fs from "node:fs";

const file = "drizzle/seed-historical.sql";
const fullNames = {
  Panthers: "Philadelphia Panthers", Sunset: "Miami Sunset", Grizzlies: "California Grizzlies",
  Knights: "Cincinnati Knights", Voodoo: "Louisiana Voodoo", Expos: "Montreal Expos",
  Otters: "Hershey Otters", Blizzards: "Colorado Blizzards", Thunderbirds: "Arizona Thunderbirds",
  Jazz: "Utah Jazz",
};
const nicknames = [
  ...Object.keys(fullNames), "Sabertooths", "Hurricanes", "Villagers", "Piranhas", "Crusaders",
  "Wildcats", "Flamingos", "Aviators", "Platypi", "Penguins", "Pistons", "Gothams",
  "Beacons", "Dolphins", "Alpacas", "Evokers", "Riptide", "Parrots", "Embers", "Wolves",
  "Nimbis", "Mafia", "Boom", "Aces", "Surf",
].sort((a, b) => b.length - a.length);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;

let sql = fs.readFileSync(file, "utf8");
sql = sql.replace(
  /INSERT INTO historical_teams \(id, season_id, name, source_team_id, wins, losses, ties\) VALUES \((\d+), (\d+), '((?:''|[^'])*)', '((?:''|[^'])*)', ([^;]+)\);/g,
  (_line, id, seasonId, sourceName, sourceTeamId, record) => {
    const clean = sourceName.replace(/\s+S\d+$/i, "").trim();
    const nickname = nicknames.find((candidate) => clean.endsWith(candidate)) ?? clean.slice(3);
    const abbreviation = clean.slice(0, -nickname.length).toUpperCase();
    const name = fullNames[nickname] ?? nickname;
    return `INSERT INTO historical_teams (id, season_id, name, abbreviation, source_name, source_team_id, wins, losses, ties) VALUES (${id}, ${seasonId}, ${quote(name)}, ${quote(abbreviation)}, ${quote(sourceName)}, '${sourceTeamId}', ${record});`;
  },
);
fs.writeFileSync(file, sql, "utf8");
console.log("Updated historical team names, abbreviations, and source names.");
