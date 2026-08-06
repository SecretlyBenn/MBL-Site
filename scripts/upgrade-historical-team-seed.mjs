import fs from "node:fs";

const file = "drizzle/seed-historical.sql";
const fullNames = {
  Panthers: "Philadelphia Panthers", Sunset: "Miami Sunset", Grizzlies: "California Grizzlies",
  Knights: "Cincinnati Knights", Voodoo: "Louisiana Voodoo", Expos: "Toronto Expos",
  Otters: "Hershey Otters", Blizzards: "Colorado Blizzards", Thunderbirds: "Arizona Thunderbirds",
  Jazz: "Utah Jazz", Piranhas: "Tijuana Piranhas", Beacons: "Baltimore Beacons",
  Wildcats: "Boston Wildcats", Pistons: "Pittsburgh Pistons", Aces: "San Antonio Aces",
  Wolves: "Texas Wolves", Boom: "Miami Boom", Surf: "Atlantic City Surf",
  Penguins: "Portland Penguins", Villagers: "Desert Valley Villagers", Nimbis: "Vancouver Nimbis",
  Parrots: "Toronto Blue Parrots", Alpacas: "Los Angeles Alpacas", Evokers: "Electro Valley Evokers",
  Crusaders: "Chicago Crusaders", Sabertooths: "San Diego Saber Tooths",
  Embers: "St. Augustine Embers", Flamingos: "New Orleans Flamingo", Aviators: "Colorado Aviators",
  Dolphins: "Golden State Dolphins", Gothams: "New York Gothams", Hurricanes: "Houston Hurricanes",
  Riptide: "Florida Riptide", Mafia: "Miami Mafia", Platypi: "Kansas City Platypi",
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
sql = sql.replace(
  /INSERT INTO historical_teams \(id, season_id, name, abbreviation, source_name, source_team_id, wins, losses, ties\) VALUES \((\d+), (\d+), '((?:''|[^'])*)', (NULL|'(?:''|[^'])*'), '((?:''|[^'])*)', '((?:''|[^'])*)', ([^;]+)\);/g,
  (_line, id, seasonId, _oldName, _oldAbbreviation, sourceName, sourceTeamId, record) => {
    const clean = sourceName.replace(/\s+S\d+$/i, "").trim();
    const nickname = nicknames.find((candidate) => clean.endsWith(candidate)) ?? clean.slice(3);
    const abbreviation = clean.slice(0, -nickname.length).toUpperCase();
    const name = fullNames[nickname] ?? nickname;
    return `INSERT INTO historical_teams (id, season_id, name, abbreviation, source_name, source_team_id, wins, losses, ties) VALUES (${id}, ${seasonId}, ${quote(name)}, ${abbreviation ? quote(abbreviation) : "NULL"}, ${quote(sourceName)}, ${quote(sourceTeamId)}, ${record});`;
  },
);
fs.writeFileSync(file, sql, "utf8");
fs.writeFileSync("drizzle/0003_seed_historical.sql", `-- Custom SQL migration file, put your code below! --\n${sql}`, "utf8");
console.log("Updated historical team names, abbreviations, and source names.");
