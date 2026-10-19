/**
 * Compares the Discord bot's rosters against the site's, and reports.
 *
 * Changes nothing. It exists because the two have drifted and nobody knows by
 * how much: an audit in October found around a hundred players on the site
 * that the bot did not have, and "most of those are released" was a reasonable
 * guess that turned out to be wrong for at least one man. vyvyn_ was on that
 * list and he was on the roster the whole time, under `vyv` - a real Minecraft
 * account belonging to somebody else entirely.
 *
 * So this matches on **account id, never on name**. A name can be right,
 * stale, a nickname, or a stranger's, and only the id tells those apart. A row
 * whose id cannot be established is reported rather than guessed at, and a bot
 * name that resolves to an account some *other* site player holds is called
 * out on its own, because that is the mistake that hides best.
 *
 * Run it after dumping the bot side on the host:
 *
 *   node scripts/reconcile-rosters.mjs path/to/bot_rosters.json
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ACCOUNT = "b690333da05f8e1aea40b7e68f6ff519";
const DB = "mbl-site-db";
/** playerdb relays Mojang and is what the site itself falls back to. */
const RELAY = "https://playerdb.co/api/player/minecraft/";

function d1(sql) {
  const out = execFileSync(
    "npx",
    ["--no-install", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
    { encoding: "utf8", env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT }, maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(out.slice(out.indexOf("[")))[0].results;
}

/** The bot stores a club as its nickname in lower case; the site uses "City Nickname". */
function clubFor(nickname, siteTeams) {
  const wanted = nickname.toLowerCase();
  const hits = siteTeams.filter((team) => team.name.toLowerCase().includes(wanted));
  return hits.length === 1 ? hits[0] : null;
}

async function mojang(name) {
  try {
    const response = await fetch(RELAY + encodeURIComponent(name));
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data?.player?.raw_id?.replace(/-/g, "") ?? null;
  } catch {
    return null;
  }
}

const source = process.argv[2];
if (!source) {
  console.error("Give me the bot_rosters.json downloaded from the host.");
  process.exit(1);
}

const dump = JSON.parse(readFileSync(source, "utf8"));
const botRows = dump.team_rosters ?? [];
console.log(`bot: ${botRows.length} rows in team_rosters\n`);

const siteTeams = d1("SELECT id, name, league_id FROM teams");
const sitePlayers = d1(
  "SELECT id, display_name, team_id, status, league_id FROM players WHERE status <> 'RELEASED'",
);
const profiles = d1("SELECT player_name, uuid FROM minecraft_profiles");

// Name -> account, exact first and then ignoring case, because the bot's
// spelling and the site's often differ only in capitals.
const byName = new Map(profiles.map((row) => [row.player_name, row.uuid]));
const byLower = new Map(profiles.map((row) => [row.player_name.toLowerCase(), row.uuid]));
const idFor = (name) => byName.get(name) ?? byLower.get(String(name).toLowerCase()) ?? null;

// The site's side, keyed by account.
const siteById = new Map();
const siteUnlinked = [];
for (const player of sitePlayers) {
  const id = idFor(player.display_name);
  if (!id) siteUnlinked.push(player);
  else siteById.set(id, player);
}

const matched = [];
const onlyBot = [];
const wrongClub = [];
const impostors = [];
const unresolved = [];
const injured = [];
const noClub = new Set();

for (const row of botRows) {
  const club = String(row.team_name ?? "");
  const name = String(row.player_name ?? "");
  if (/IL$/i.test(club)) {
    injured.push({ club, name });
    continue;
  }

  const team = clubFor(club, siteTeams);
  if (!team) {
    noClub.add(club);
    continue;
  }

  let id = idFor(name);
  if (!id) id = await mojang(name);

  if (!id) {
    unresolved.push({ club, name });
    continue;
  }

  const onSite = siteById.get(id);
  if (!onSite) {
    // The account is real but nobody on the site holds it. Either a player the
    // site has never had, or - the vyv case - a stranger's account typed in
    // place of the real man's name.
    const nameIsTaken = profiles.some((p) => p.uuid === id);
    onlyBot.push({ club, name, id, known: nameIsTaken });
    continue;
  }

  if (onSite.team_id !== team.id) {
    wrongClub.push({ name, id, bot: team.name, site: siteTeams.find((t) => t.id === onSite.team_id)?.name ?? "no club" });
    continue;
  }

  matched.push({ club: team.name, name, id });
  if (onSite.display_name !== name) {
    impostors.push({ club: team.name, bot: name, site: onSite.display_name, id });
  }
}

// Anyone on a site club that the bot never mentioned.
const claimed = new Set(matched.map((m) => m.id).concat(wrongClub.map((m) => m.id)));
const onlySite = sitePlayers
  .filter((player) => player.team_id !== null)
  .map((player) => ({ player, id: idFor(player.display_name) }))
  .filter(({ id }) => !id || !claimed.has(id))
  .map(({ player, id }) => ({
    name: player.display_name,
    club: siteTeams.find((t) => t.id === player.team_id)?.name ?? "?",
    status: player.status,
    id: id ?? "no account linked",
  }));

const show = (title, rows, line) => {
  console.log(`\n=== ${title} (${rows.length}) ===`);
  for (const row of rows.slice(0, 200)) console.log("  " + line(row));
  if (rows.length > 200) console.log(`  ... and ${rows.length - 200} more`);
};

console.log(`matched on both sides, same club: ${matched.length}`);
show("on the bot, not on the site", onlyBot, (r) => `${r.club.padEnd(14)} ${r.name.padEnd(20)} ${r.id}${r.known ? "  (account is on the site under another name)" : ""}`);
show("on the bot under a different name than the site has", impostors, (r) => `${r.club.padEnd(14)} bot:${r.bot.padEnd(18)} site:${r.site}`);
show("on a different club than the site thinks", wrongClub, (r) => `${r.name.padEnd(20)} bot:${r.bot.padEnd(22)} site:${r.site}`);
show("on the site, not on the bot - the release candidates", onlySite, (r) => `${r.club.padEnd(22)} ${r.name.padEnd(20)} ${r.status}`);
show("bot names no account could be found for", unresolved, (r) => `${r.club.padEnd(14)} ${r.name}`);
show("site players with no account linked", siteUnlinked, (r) => `${r.display_name}`);
show("injury lists, not compared", injured, (r) => `${r.club.padEnd(16)} ${r.name}`);
if (noClub.size) show("bot clubs with no match on the site", [...noClub], (r) => r);

writeFileSync(
  "roster-release-candidates.csv",
  "club,player,status,account\n" + onlySite.map((r) => `${r.club},${r.name},${r.status},${r.id}`).join("\n") + "\n",
);
console.log("\nWrote roster-release-candidates.csv - nothing has been changed.");
