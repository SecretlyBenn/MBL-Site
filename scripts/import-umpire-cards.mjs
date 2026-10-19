/**
 * Turns the umpires' Google Sheets scorecards into a migration for the archive.
 *
 * The MCBA's fourteenth season was imported from MyStatsOnline, but its
 * championship round was played here and scored the way the league actually
 * scores: one spreadsheet per game, a cell per plate appearance, filled in by
 * whoever had the clicker. Those cards are the only record of those games, so
 * this reads them rather than asking anyone to retype eight box scores.
 *
 * It invents nothing. Every number it writes is either copied off the card or
 * counted from the card's own cells, and anywhere the card disagrees with
 * itself - a pitcher's hits-allowed that does not match the other side's hits -
 * it prints the disagreement and writes both figures as given. The umpire can
 * then fix the sheet; guessing which half is right is how a season ends up with
 * totals nobody can trace.
 *
 * Names are the other half of the job. Cards say "Pika", "Narwhal", "CPA", and
 * the archive is keyed by player name, so an unmapped name would quietly open a
 * second career for a man who already has one. NAMES below is the only place a
 * card name becomes an archive name, and an unknown one stops the run.
 *
 *   node scripts/import-umpire-cards.mjs <dir holding g1.csv..g8.csv> > drizzle/00NN.sql
 *
 * Nothing is applied. SQL goes to stdout, the report to stderr.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Season 46 is MCBA Season XIV Playoffs; these are its historical_teams ids. */
const SEASON = 46;
const CLUB = { Batsmen: 413, Beavers: 408, Hitmen: 411, Spiders: 407 };

/**
 * Card name (lower case, trimmed) -> the name the archive already uses.
 *
 * Taken from MCBA Season XIV's own rosters, so a man's championship line lands
 * on the same name as his regular season. The four at the bottom are on no
 * roster the site holds; they keep the spelling the card gave them and are
 * reported, because filing them under somebody else's name is worse than
 * leaving them unlinked.
 */
const NAMES = {
  // Batsmen
  pikachichi: "Pikachachi",
  pika: "Pikachachi",
  bigboyyahu: "bigboyyahu",
  whitewonders_: "whitewonders_",
  blazingrhino: "Blazingrhino85",
  dyno: "DyN0Btw_",
  gunnar: "EPGunner",
  epgunnar: "EPGunner",
  midnight: "M1dN1qht",
  m1dn1qht: "M1dN1qht",
  cosmiclol: "Cosmiclolll",
  cosmic: "Cosmiclolll",
  mysteriousfish: "Mysterious_Fish",
  yeets: "yeetsewerret1216",
  // Hitmen
  cleanfel: "Cleanfel",
  kavwild: "TheRealKavWild",
  therealkavwild: "TheRealKavWild",
  coolblastr: "CoolBlastr",
  aiirbnb: "aiirbnb",
  matatouille21: "matatouille",
  hazzgames: "HazzGames",
  hazz: "HazzGames",
  heroham: "Hero_HamSandwich",
  beachgamer: "Beachgamer1651",
  beachgamer1651: "Beachgamer1651",
  optionallabor: "OptionalLabour",
  optionallabour: "OptionalLabour",
  plurpld: "PlurplDurpl",
  plurpl: "PlurplDurpl",
  b1nx: "_b1nx",
  _b1nx: "_b1nx",
  // Beavers
  fallman: "Fallman10",
  fallman10: "Fallman10",
  narwhal: "Lastnarwhal",
  lastnarwhal: "Lastnarwhal",
  latnarwhal: "Lastnarwhal",
  pufferfish: "Pufferf1sh222",
  leo: "LeoLaVedette",
  dream: "Dreamslayer3485",
  dezjoe: "DezJoe",
  imyourbizz: "ImYourBizz",
  basebros: "Basebros",
  devin: "devin_god1994",
  scarecrow: "_sc4recr0w_",
  scarecriw: "_sc4recr0w_",
  "scarecrowc@": "_sc4recr0w_",
  // Spiders
  lowtiernormy: "LowTierNormy",
  lowteirnormy: "LowTierNormy",
  rebusher: "rebusher",
  cretema: "CreteMA07",
  cretema07: "CreteMA07",
  vertigo: "VertigoIsSad",
  vertigoissad: "VertigoIsSad",
  verigoissad: "VertigoIsSad",
  sleepyhallow: "SleepyHallow2nd",
  sleepyhallow2nd: "SleepyHallow2nd",
  sleepy: "SleepyHallow2nd",
  cardsfan: "CardsFan1982",
  realistjames: "RealistJames",
  siren: "Si_ren65",
  si_ren65: "Si_ren65",
  xelemental: "xelementa1",
  cpa: "Coolpandaace23",
  slinky7: "TSlinky7",
  tsslinky7: "TSlinky7",
  austinmat: "AustinMat235611",
  austinmat235611: "AustinMat235611",
  // On no roster the site holds. The two Elite spellings are one man and
  // neither resolves on Mojang, so the two cards that agree decide it.
  iko: "Iko",
  elite080812: "Elite080812",
  elite082012: "Elite080812",
  tino: "Tino",
  miniboi: "Miniboi",
};
const UNROSTERED = ["Iko", "Elite080812", "Tino", "Miniboi"];

const notes = [];
const problems = [];
const note = (line) => notes.push(line);
const problem = (line) => problems.push(line);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const archiveName = (raw, where) => {
  const key = String(raw).trim().toLowerCase();
  const found = NAMES[key];
  if (!found) throw new Error(`${where}: no archive name for "${String(raw).trim()}". Add it to NAMES.`);
  return found;
};

/**
 * "4.2" on a card is four innings and two thirds, not four and a fifth, and
 * the column is a real number of innings - an ERA computed from 4.2 is a
 * sixth too low.
 */
export const thirds = (raw) => {
  const text = String(raw ?? "").trim();
  const parts = text.match(/^(\d+)(?:\.(\d))?$/);
  if (!parts) return null;
  return Number(parts[1]) + (parts[2] ? Number(parts[2]) / 3 : 0);
};

const num = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

/**
 * One plate appearance, read off one cell.
 *
 * The first token is what the batter did; everything after a `+` is a
 * modifier, and most modifiers are base-running - "adv 3", "out adv" - which
 * change nothing on a batting line. Returns null for a cell that is not a
 * plate appearance ("skip"), and a `note` for the free text umpires write in
 * the innings a short game never reached ("Hitmen win 4-3", "WP: cleanfel").
 */
export function readPlay(cell) {
  // "(RP1) 2B", "(SP > RP1) 1B" and "RP1: K" all mark a pitching change made
  // before the pitch. Who was pitching comes from the pitching block.
  const text = cell.replace(/^\s*\([^)]*\)\s*/, "").replace(/^\s*RP\d\s*:\s*/i, "").trim();
  const parts = text.split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const [head, ...mods] = parts;

  const play = {
    ab: 0, hit: 0, double: 0, triple: 0, homer: 0, walk: 0, strikeout: 0,
    sacFly: 0, sacBunt: 0, rbis: 0, run: 0, caughtStealing: 0,
  };

  if (/^skip$/i.test(head)) return null;
  else if (/^1B$/i.test(head)) { play.ab = 1; play.hit = 1; }
  else if (/^2B$/i.test(head)) { play.ab = 1; play.hit = 1; play.double = 1; }
  else if (/^3B$/i.test(head)) { play.ab = 1; play.hit = 1; play.triple = 1; }
  else if (/^HR$/i.test(head)) { play.ab = 1; play.hit = 1; play.homer = 1; }
  else if (/^K$/i.test(head)) { play.ab = 1; play.strikeout = 1; }
  else if (/^BB$/i.test(head)) play.walk = 1;
  else if (/^SF$/i.test(head)) play.sacFly = 1;
  else if (/^SAC$/i.test(head)) play.sacBunt = 1;
  // Fly, pop, line and ground outs, force outs and fielders' choices: an at
  // bat and no hit, however the fielders wrote the putout down.
  else if (/^[FPLG]\s*\d+(\s*-\s*\d+)?U?$/i.test(head)) play.ab = 1;
  // The same outs written with the words in front - "GO 4-3", "FC 5-3", "PO3".
  // Only fielding notation may follow, so a note that happens to start with
  // one of these is still read as a note rather than as a phantom at bat.
  else if (/^(GO|FO|FC|PO)[\s\d\-U]*$/i.test(head)) play.ab = 1;
  // Reached on an error - "E3", or "R2 on E1" for reaching second on one. An
  // at bat, and not a hit.
  else if (/^E\d/i.test(head) || /^R\d\s+on\s+E\d/i.test(head)) play.ab = 1;
  else return { note: text };

  for (const mod of mods) {
    const rbi = mod.match(/^(\d+)?\s*RBIs?$/i);
    if (rbi) {
      play.rbis += rbi[1] ? Number(rbi[1]) : 1;
      continue;
    }
    if (/^R$/i.test(mod) || /^R\s+from\s+E\d/i.test(mod)) {
      play.run = 1;
      continue;
    }
    if (/^CS\d*$/i.test(mod)) {
      play.caughtStealing += 1;
      continue;
    }
    // Steals, advances and being thrown out advancing. The per-player Stolen
    // column is the count the card actually totals, so SB marks are left to
    // it; the rest never touch a batting line.
    if (/^SB$/i.test(mod)) continue;
    if (/^(out\s+adv|OADV|adv)/i.test(mod)) continue;
    if (/^C->/i.test(mod)) continue;
    note(`unread modifier "${mod}" in cell "${cell.trim()}"`);
  }
  return play;
}

/**
 * One team's half of a card: nine lineup rows, a pitching block, five bench
 * rows and the team totals. The offsets are fixed by the template.
 */
function readBlock(rows, head, where) {
  const header = rows[head];
  const stolenAt = header.indexOf("Stolen");
  if (stolenAt < 0) throw new Error(`${where}: no Stolen column in row ${head + 1}`);
  const club = header[1].trim();

  const batters = new Map();
  const cellNotes = [];
  // A bench row carries plate appearances whenever somebody came in, so it is
  // read exactly like a lineup row.
  for (const offset of [1, 2, 3, 4, 5, 6, 7, 8, 9, 19, 20, 21, 22, 23]) {
    const row = rows[head + offset];
    if (!row || !row[1] || !row[1].trim()) continue;
    const name = archiveName(row[1], `${where} row ${head + offset + 1}`);
    if (batters.has(name)) note(`${where}: ${name} is on two rows; the two are added together`);
    const line = batters.get(name) ?? {
      name, atBats: 0, runs: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0,
      rbis: 0, walks: 0, strikeouts: 0, sacFlies: 0, sacBunts: 0,
      caughtStealing: 0, stolenBases: 0, leftOnBase: 0, errors: 0,
      runsByInning: new Map(),
    };
    line.stolenBases += num(row[stolenAt]) ?? 0;
    line.leftOnBase += num(row[stolenAt + 1]) ?? 0;
    line.errors += num(row[stolenAt + 2]) ?? 0;

    for (let col = 2; col < stolenAt; col++) {
      const cell = (row[col] ?? "").trim();
      if (!cell) continue;
      const inning = col - 1;
      for (const piece of cell.split("///")) {
        const play = readPlay(piece);
        if (!play) continue;
        if (play.note) {
          cellNotes.push(play.note);
          continue;
        }
        line.atBats += play.ab;
        line.hits += play.hit;
        line.doubles += play.double;
        line.triples += play.triple;
        line.homeRuns += play.homer;
        line.rbis += play.rbis;
        line.walks += play.walk;
        line.strikeouts += play.strikeout;
        line.sacFlies += play.sacFly;
        line.sacBunts += play.sacBunt;
        line.caughtStealing += play.caughtStealing;
        line.runs += play.run;
        if (play.run) line.runsByInning.set(inning, (line.runsByInning.get(inning) ?? 0) + 1);
      }
    }
    batters.set(name, line);
  }

  const pitchers = [];
  for (const offset of [12, 13, 14, 15, 16]) {
    const row = rows[head + offset];
    if (!row || !row[1] || !row[1].trim()) continue;
    const innings = thirds(row[2]);
    if (!innings) continue;
    pitchers.push({
      name: archiveName(row[1], `${where} pitcher row ${head + offset + 1}`),
      started: offset === 12,
      card: String(row[2]).trim(),
      inningsPitched: innings,
      hitsAllowed: num(row[3]) ?? 0,
      earnedRuns: num(row[4]) ?? 0,
      unearnedRuns: num(row[5]) ?? 0,
      walksAllowed: num(row[6]) ?? 0,
      strikeoutsPitched: num(row[7]) ?? 0,
      homeRunsAllowed: num(row[8]) ?? 0,
      outs: num(row[9]),
    });
  }

  // Two total rows, not one: the lineup's sits on the pitching header and the
  // bench's at the foot of the bench block. A substitute's left-on-base is in
  // the second, so both are needed to check the batters add up.
  const both = (column) =>
    (num(rows[head + 11][column]) ?? 0) + (num(rows[head + 24][column]) ?? 0);
  return {
    club,
    batters: [...batters.values()],
    pitchers,
    teamStolen: both(stolenAt),
    teamLob: both(stolenAt + 1),
    teamErrors: both(stolenAt + 2),
    cellNotes,
  };
}

const sum = (rows, field) => rows.reduce((total, row) => total + (row[field] ?? 0), 0);
const q = (text) => "'" + String(text).replace(/'/g, "''") + "'";

/** Each card's fixture, in the order the links were given. */
const FIXTURES = [
  { card: "g1.csv", gameId: 4835 },
  { card: "g2.csv", gameId: 4837 },
  { card: "g3.csv", gameId: 4838 },
  // Undated and unsigned, scored by joshygg on 9 October: game one of the
  // championship round between the Beavers and the Spiders, whatever order the
  // cards arrived in.
  { card: "g4.csv", gameId: 4836 },
  { card: "g5.csv", gameId: 4839 },
  { card: "g6.csv", gameId: 4840 },
  // The final was not on the schedule - the championship round had to finish
  // before anyone knew who would play it.
  { card: "g7.csv", insert: { sourceGameId: "MCBA14-F1", playedOn: "Monday October 12, 2026", sortOrder: 8 } },
  { card: "g8.csv", insert: { sourceGameId: "MCBA14-F2", playedOn: "Friday October 16, 2026", sortOrder: 9 } },
];

const dir = process.argv[2];
// tests/umpire-cards.test.mjs imports this for its cell grammar and has no
// cards to give it, so only a direct run reads any.
const reading = process.argv[1]?.endsWith("import-umpire-cards.mjs") ?? false;
if (reading && !dir) {
  console.error("Give me the directory holding g1.csv .. g8.csv");
  process.exit(1);
}
const present = reading ? new Set(readdirSync(dir)) : new Set();

const sql = [
  "-- MCBA Season XIV championship round and final, from the umpires' cards.",
  "-- Written by scripts/import-umpire-cards.mjs; see that file for how.",
  "",
];

for (const fixture of reading ? FIXTURES : []) {
  if (!present.has(fixture.card)) throw new Error(`${fixture.card} is not in ${dir}`);
  const rows = parseCsv(readFileSync(join(dir, fixture.card), "utf8"));
  const where = fixture.card;
  const away = readBlock(rows, 1, `${where} away`);
  const home = readBlock(rows, 26, `${where} home`);
  const cardDate = (rows[0][1] ?? "").trim();
  const umpire = (rows[0][3] ?? "").trim();
  const cardNotes = [...away.cellNotes, ...home.cellNotes];

  // The score is the runs the other side's pitchers gave up. The "+R" marks on
  // the batting rows come to the same figure when every scorer was ticked, but
  // umpires tick inconsistently and a pitching line is one number per pitcher,
  // so the pitching lines decide it - cross-checked below against the marks and
  // against whatever the umpire wrote in the spare innings.
  const runsOff = (side) => sum(side.pitchers, "earnedRuns") + sum(side.pitchers, "unearnedRuns");
  const awayScore = runsOff(home);
  const homeScore = runsOff(away);

  for (const [side, other, scored] of [[away, home, awayScore], [home, away, homeScore]]) {
    const marked = sum(side.batters, "runs");
    if (marked !== scored) {
      const missing = scored - marked;
      problem(`${where} ${side.club}: ${scored} runs by the pitching lines, but only ${marked} batter${marked === 1 ? "" : "s"} marked "+R". Nobody is credited with ${missing} run${missing === 1 ? "" : "s"}, so the inning-by-inning line is left off this game.`);
    }
    const hits = sum(side.batters, "hits");
    if (hits !== sum(other.pitchers, "hitsAllowed")) {
      problem(`${where} ${side.club}: ${hits} hits in the batting cells, ${sum(other.pitchers, "hitsAllowed")} hits allowed on the ${other.club} pitching line.`);
    }
    const strikeouts = sum(side.batters, "strikeouts");
    if (strikeouts !== sum(other.pitchers, "strikeoutsPitched")) {
      problem(`${where} ${side.club}: ${strikeouts} strikeouts in the cells, ${sum(other.pitchers, "strikeoutsPitched")} on the ${other.club} pitching line.`);
    }
    const walks = sum(side.batters, "walks");
    if (walks !== sum(other.pitchers, "walksAllowed")) {
      problem(`${where} ${side.club}: ${walks} walks in the cells, ${sum(other.pitchers, "walksAllowed")} on the ${other.club} pitching line.`);
    }
    if (sum(side.batters, "leftOnBase") !== side.teamLob) {
      problem(`${where} ${side.club}: left-on-base per batter sums to ${sum(side.batters, "leftOnBase")}, the card's own team total says ${side.teamLob}.`);
    }
    if (sum(side.batters, "stolenBases") !== side.teamStolen) {
      problem(`${where} ${side.club}: stolen bases per batter sum to ${sum(side.batters, "stolenBases")}, the team total says ${side.teamStolen}.`);
    }
    if (sum(side.batters, "errors") !== side.teamErrors) {
      problem(`${where} ${side.club}: errors per batter sum to ${sum(side.batters, "errors")}, the team total says ${side.teamErrors}.`);
    }
    for (const pitcher of side.pitchers) {
      if (pitcher.outs !== null && Math.abs(pitcher.outs - pitcher.inningsPitched * 3) > 0.02) {
        problem(`${where} ${side.club}: ${pitcher.name} is down for ${pitcher.card} innings but ${pitcher.outs} outs.`);
      }
    }
    note(`${where} ${side.club}: ${scored} R, ${hits} H, ${side.teamErrors} E, ${side.batters.length} batters, ${side.pitchers.length} pitcher${side.pitchers.length === 1 ? "" : "s"}`);
  }

  // Decisions, from whatever the umpire wrote in the innings a short game
  // never reached.
  const decision = (tag) => {
    const found = cardNotes.find((text) => new RegExp(`^${tag}\\s*:`, "i").test(text));
    return found ? archiveName(found.slice(found.indexOf(":") + 1), `${where} ${tag}`) : null;
  };
  const saver = decision("SV");
  // A side that used one pitcher has only one man the decision can belong to,
  // so an unsigned card still settles it. Two pitchers and no name on the card
  // is a real gap: which of them it is depends on when the lead changed, which
  // the card does not record.
  const only = (side) => (side.pitchers.length === 1 ? side.pitchers[0].name : null);
  const wonBy = awayScore > homeScore ? away : home;
  const lostBy = awayScore > homeScore ? home : away;
  const winner = decision("WP") ?? only(wonBy);
  const loser = decision("LP") ?? only(lostBy);
  if (!winner) problem(`${where}: no winning pitcher named, and the ${wonBy.club} used ${wonBy.pitchers.length} pitchers, so the win is unassigned.`);
  if (!loser) problem(`${where}: no losing pitcher named, and the ${lostBy.club} used ${lostBy.pitchers.length} pitchers, so the loss is unassigned.`);
  if (winner && !wonBy.pitchers.some((p) => p.name === winner)) {
    problem(`${where}: ${winner} is credited with the win but pitched for the side that lost.`);
  }
  if (loser && !lostBy.pitchers.some((p) => p.name === loser)) {
    problem(`${where}: ${loser} is charged with the loss but pitched for the side that won.`);
  }
  for (const name of [winner, loser, saver].filter(Boolean)) {
    if (![...away.pitchers, ...home.pitchers].some((p) => p.name === name)) {
      problem(`${where}: ${name} is named in a decision but is in neither pitching block.`);
    }
  }

  // Umpires write two kinds of score in the spare innings - the game's and the
  // series' - in the same shape and in no fixed order ("Spiders Win 7-0 F/5"
  // next to "Spiders Lead 2-0"). So any one of them agreeing is the check;
  // demanding the first one match called a correct 3-0 card wrong because the
  // series note came first.
  const pair = (x, y) => [x, y].sort((m, n) => m - n).join("-");
  const scores = cardNotes
    .filter((text) => /\d+\s*-\s*\d+/.test(text) && !/series/i.test(text))
    .map((text) => ({ text, match: text.match(/(\d+)\s*-\s*(\d+)/) }));
  if (scores.length) {
    if (!scores.some(({ match }) => pair(Number(match[1]), Number(match[2])) === pair(awayScore, homeScore))) {
      problem(`${where}: the pitching lines give ${awayScore}-${homeScore}, and nothing the umpire wrote says that - only ${scores.map(({ text }) => `"${text}"`).join(", ")}.`);
    }
  } else {
    note(`${where}: no final score written on the card; ${awayScore}-${homeScore} comes from the pitching lines alone.`);
  }

  // "F/5", "F/7" - how many innings were played. The MCBA plays five, so only
  // a different number is worth a note on the game.
  const called = cardNotes.map((text) => text.match(/F\s*\/\s*(\d+)/i)).find(Boolean);
  const inningsPlayed = called ? Number(called[1]) : null;
  const shortNote = inningsPlayed && inningsPlayed !== 5 ? `${inningsPlayed} innings` : null;

  /**
   * The per-inning line, but only when both sides' marks account for every
   * run. A partial row would read as a 1-0 game that actually finished 5-2,
   * and half a line score is worse than none: the game page falls back to
   * R/H/E alone when the innings are blank, which is the honest answer when
   * the card does not say which inning the runs came in.
   */
  const marksComplete =
    sum(away.batters, "runs") === awayScore && sum(home.batters, "runs") === homeScore;
  const lineFor = (side) => {
    if (!marksComplete) return "";
    const byInning = new Map();
    for (const batter of side.batters) {
      for (const [inning, runs] of batter.runsByInning) {
        byInning.set(inning, (byInning.get(inning) ?? 0) + runs);
      }
    }
    const last = Math.max(inningsPlayed ?? 5, ...byInning.keys());
    return Array.from({ length: last }, (_, index) => byInning.get(index + 1) ?? 0).join(",");
  };

  sql.push(`-- ${where}: ${away.club} ${awayScore} @ ${home.club} ${homeScore} - ${cardDate || "no date on the card"}, ${umpire || "no umpire on the card"}`);
  if (fixture.gameId) {
    sql.push(`UPDATE historical_games SET away_score = ${awayScore}, home_score = ${homeScore}${shortNote ? `, note = ${q(shortNote)}` : ""} WHERE id = ${fixture.gameId} AND season_id = ${SEASON};`);
    sql.push(`DELETE FROM historical_line_scores WHERE game_id = ${fixture.gameId};`);
    sql.push(`DELETE FROM historical_game_stats WHERE game_id = ${fixture.gameId};`);
  } else {
    const { sourceGameId, playedOn, sortOrder } = fixture.insert;
    const extra = shortNote ? `, note` : "";
    const extraValue = shortNote ? `, ${q(shortNote)}` : "";
    sql.push(`DELETE FROM historical_game_stats WHERE game_id IN (SELECT id FROM historical_games WHERE source_game_id = ${q(sourceGameId)});`);
    sql.push(`DELETE FROM historical_line_scores WHERE game_id IN (SELECT id FROM historical_games WHERE source_game_id = ${q(sourceGameId)});`);
    sql.push(`DELETE FROM historical_games WHERE source_game_id = ${q(sourceGameId)};`);
    sql.push(`INSERT INTO historical_games (source_game_id, season_id, played_on, away_team_id, home_team_id, away_score, home_score, sort_order${extra}) VALUES (${q(sourceGameId)}, ${SEASON}, ${q(playedOn)}, ${CLUB[away.club]}, ${CLUB[home.club]}, ${awayScore}, ${homeScore}, ${sortOrder}${extraValue});`);
  }
  const game = fixture.gameId ?? `(SELECT id FROM historical_games WHERE source_game_id = ${q(fixture.insert.sourceGameId)})`;

  for (const [side, isHome, scored] of [[away, 0, awayScore], [home, 1, homeScore]]) {
    sql.push(`INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (${game}, ${isHome}, ${q(side.club)}, ${q(lineFor(side))}, ${scored}, ${sum(side.batters, "hits")}, ${side.teamErrors});`);
  }

  for (const [side, isHome] of [[away, 0], [home, 1]]) {
    for (const batter of side.batters) {
      // A man on the card who never came to the plate keeps his row: dropping
      // it would take a game off his season.
      const cols = {
        at_bats: batter.atBats, runs: batter.runs, hits: batter.hits,
        doubles: batter.doubles, triples: batter.triples, home_runs: batter.homeRuns,
        rbis: batter.rbis, walks: batter.walks, strikeouts: batter.strikeouts,
        stolen_bases: batter.stolenBases, caught_stealing: batter.caughtStealing,
        sac_flies: batter.sacFlies, sac_bunts: batter.sacBunts,
        left_on_base: batter.leftOnBase, errors: batter.errors,
      };
      sql.push(`INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, ${Object.keys(cols).join(", ")}) VALUES (${game}, ${isHome}, 'BATTING', ${q(batter.name)}, ${Object.values(cols).join(", ")});`);
    }
    // A complete game is the whole of the opponent's batting, which on these
    // cards is simply the side having used one pitcher.
    const alone = side.pitchers.length === 1;
    for (const pitcher of side.pitchers) {
      const runsAllowed = pitcher.earnedRuns + pitcher.unearnedRuns;
      const cols = {
        innings_pitched: pitcher.inningsPitched, hits_allowed: pitcher.hitsAllowed,
        runs_allowed: runsAllowed, earned_runs: pitcher.earnedRuns,
        home_runs_allowed: pitcher.homeRunsAllowed,
        strikeouts_pitched: pitcher.strikeoutsPitched, walks_allowed: pitcher.walksAllowed,
        games_started: pitcher.started ? 1 : 0,
        complete_games: alone ? 1 : 0,
        shutouts: alone && runsAllowed === 0 ? 1 : 0,
        wins: pitcher.name === winner ? 1 : 0,
        losses: pitcher.name === loser ? 1 : 0,
        saves: pitcher.name === saver ? 1 : 0,
      };
      sql.push(`INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, ${Object.keys(cols).join(", ")}) VALUES (${game}, ${isHome}, 'PITCHING', ${q(pitcher.name)}, ${Object.values(cols).join(", ")});`);
    }
  }
  sql.push("");
}

if (reading) {
  console.log(sql.join("\n"));
  console.error("=== cards read ===");
  for (const line of notes) console.error("  " + line);
  console.error(`\n=== on no roster the site holds (${UNROSTERED.length}) ===`);
  for (const name of UNROSTERED) console.error("  " + name);
  console.error(`\n=== the cards disagree with themselves (${problems.length}) ===`);
  for (const line of problems) console.error("  " + line);
}
