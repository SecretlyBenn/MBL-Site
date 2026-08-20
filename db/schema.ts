import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Roles are plain strings (not a DB enum - sqlite/D1 has no native enum type),
// validated at the application layer. See lib/roles.ts.
export const ROLES = ["ADMIN", "HEAD_UMPIRE", "UMPIRE", "GM"] as const;
export type Role = (typeof ROLES)[number];

export const PLAYER_STATUSES = ["FREE_AGENT", "ACTIVE", "TRIPLE_A", "RELEASED"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const ROSTER_MOVE_TYPES = ["SIGN", "RELEASE", "SEND_DOWN", "RECALL"] as const;
export type RosterMoveType = (typeof ROSTER_MOVE_TYPES)[number];

export const GAME_STATUSES = ["SCHEDULED", "FINAL", "CANCELLED"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const SCORECARD_STATUSES = ["PENDING", "APPROVED", "RETURNED"] as const;
export type ScorecardStatus = (typeof SCORECARD_STATUSES)[number];

// A user's identity comes from ChatGPT sign-in (see app/chatgpt-auth.ts); this
// table maps that authenticated email to a league role. Rows are created by an
// admin, not by self-signup - being able to sign in with ChatGPT does not by
// itself grant any access.
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Discord's numeric user id. The stable identity - usernames change, and
  // the league identifies people by their Discord account.
  discordId: text("discord_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  // Only meaningful (and required) for GM role - which team they manage.
  teamId: integer("team_id").references(() => teams.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  abbreviation: text("abbreviation").notNull(),
  color: text("color"),
  logoUrl: text("logo_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// The eligible player pool. Admins create players here; teamId/status are the
// current-state snapshot (denormalized for cheap roster queries), while
// rosterMoves is the append-only source of truth/history behind them.
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  minecraftUsername: text("minecraft_username").notNull().unique(),
  displayName: text("display_name").notNull(),
  teamId: integer("team_id").references(() => teams.id),
  status: text("status").notNull().default("FREE_AGENT"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const rosterMoves = sqliteTable("roster_moves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  // Null when the move results in free agency (e.g. RELEASE).
  teamId: integer("team_id").references(() => teams.id),
  moveType: text("move_type").notNull(),
  actingUserId: integer("acting_user_id")
    .notNull()
    .references(() => users.id),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  homeTeamId: integer("home_team_id")
    .notNull()
    .references(() => teams.id),
  awayTeamId: integer("away_team_id")
    .notNull()
    .references(() => teams.id),
  scheduledAt: text("scheduled_at").notNull(),
  status: text("status").notNull().default("SCHEDULED"),
  // Set when this fixture already exists in the archive as an unplayed row -
  // the remaining Season XII schedule. Publishing then fills that row in
  // instead of adding a second copy of the same game.
  sourceGameId: text("source_game_id"),
  // Set only once an approved scorecard exists for this game.
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Submitted by a game umpire after the fact (not live in-game). A head umpire
// approves or returns it; only APPROVED scorecards feed standings/stats.
export const scorecards = sqliteTable("scorecards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id),
  submittedByUserId: integer("submitted_by_user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("PENDING"),
  homeScore: integer("home_score").notNull(),
  awayScore: integer("away_score").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
  reviewNote: text("review_note"),
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
});

export const scorecardLines = sqliteTable("scorecard_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scorecardId: integer("scorecard_id")
    .notNull()
    .references(() => scorecards.id),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  atBats: integer("at_bats").notNull().default(0),
  hits: integer("hits").notNull().default(0),
  runs: integer("runs").notNull().default(0),
  rbis: integer("rbis").notNull().default(0),
  homeRuns: integer("home_runs").notNull().default(0),
  walks: integer("walks").notNull().default(0),
  strikeouts: integer("strikeouts").notNull().default(0),
  inningsPitched: real("innings_pitched").notNull().default(0),
  earnedRuns: integer("earned_runs").notNull().default(0),
  strikeoutsPitched: integer("strikeouts_pitched").notNull().default(0),
  walksAllowed: integer("walks_allowed").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Historical archive (imported from MyStatsOnline, seasons IV-XII).
//
// Kept separate from the live tables above on purpose: this data is read-only,
// already-final, has no scorecard/approval trail behind it, and its teams and
// players are historical (a team name in season IV may no longer exist). Public
// stat pages union these with computed live stats rather than the importer
// trying to backfill fake games/scorecards.
// ---------------------------------------------------------------------------

export const historicalSeasons = sqliteTable("historical_seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  // Source system's season id, so a re-import can match rows instead of duplicating.
  sourceSeasonId: text("source_season_id").notNull(),
  isPlayoffs: integer("is_playoffs", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const historicalTeams = sqliteTable("historical_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id")
    .notNull()
    .references(() => historicalSeasons.id),
  // Display name with the abbreviation prefix stripped, expanded to the full
  // franchise name where known (e.g. "EXTExpos" -> "Toronto Expos").
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  // Exactly as it appeared in the source export, so a re-import can still match.
  sourceName: text("source_name").notNull(),
  sourceTeamId: text("source_team_id").notNull(),
  // "AMERICAN" | "NATIONAL", derived from which of the source's two standings
  // tables the team appeared in. Null when the season's standings are missing.
  league: text("league"),
  wins: integer("wins"),
  losses: integer("losses"),
  ties: integer("ties"),
  runsScored: integer("runs_scored"),
  runsAllowed: integer("runs_allowed"),
});

// One row per player per team per season. Batting and pitching columns are
// nullable because a given player may appear in only one of the two tables.
export const historicalPlayerStats = sqliteTable("historical_player_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id")
    .notNull()
    .references(() => historicalSeasons.id),
  historicalTeamId: integer("historical_team_id")
    .notNull()
    .references(() => historicalTeams.id),
  playerName: text("player_name").notNull(),
  // True when this is the team the player finished the season on. Derived from
  // the source's "current roster" view, which lists each player under their
  // final team - the only chronological signal the export carries. Used to
  // label a multi-team player's aggregated season line.
  isSeasonEndTeam: integer("is_season_end_team", { mode: "boolean" })
    .notNull()
    .default(false),
  // Batting
  games: integer("games"),
  atBats: integer("at_bats"),
  runs: integer("runs"),
  hits: integer("hits"),
  doubles: integer("doubles"),
  triples: integer("triples"),
  homeRuns: integer("home_runs"),
  rbis: integer("rbis"),
  walks: integer("walks"),
  strikeouts: integer("strikeouts"),
  stolenBases: integer("stolen_bases"),
  battingAverage: real("batting_average"),
  onBasePct: real("on_base_pct"),
  sluggingPct: real("slugging_pct"),
  ops: real("ops"),
  totalBases: integer("total_bases"),
  singles: integer("singles"),
  // Plate appearances as the source counts them, rather than AB + BB, which
  // misses sacrifices.
  plateAppearances: integer("plate_appearances"),
  caughtStealing: integer("caught_stealing"),
  sacFlies: integer("sac_flies"),
  leftOnBase: integer("left_on_base"),
  // Not shown on the stat tables, but it belongs in on-base percentage and
  // in the plate-appearance count, neither of which is right without it.
  hitByPitch: integer("hit_by_pitch"),
  // Fielding travels with the batting line in the source.
  putouts: integer("putouts"),
  errors: integer("errors"),
  fieldingPct: real("fielding_pct"),
  // Pitching
  pitchingGames: integer("pitching_games"),
  gamesStarted: integer("games_started"),
  wins: integer("wins"),
  losses: integer("losses"),
  saves: integer("saves"),
  inningsPitched: real("innings_pitched"),
  hitsAllowed: integer("hits_allowed"),
  runsAllowed: integer("runs_allowed"),
  earnedRuns: integer("earned_runs"),
  homeRunsAllowed: integer("home_runs_allowed"),
  strikeoutsPitched: integer("strikeouts_pitched"),
  walksAllowed: integer("walks_allowed"),
  era: real("era"),
  whip: real("whip"),
  completeGames: integer("complete_games"),
  shutouts: integer("shutouts"),
  blownSaves: integer("blown_saves"),
  // Walks and strikeouts per game, as the source publishes them.
  walksPerGame: real("walks_per_game"),
  strikeoutsPerGame: real("strikeouts_per_game"),
});

/**
 * The team's listed roster for a season, as opposed to who actually recorded a
 * stat line. Carries jersey number and position, which the stat tables don't,
 * and can include players who never appeared in a game.
 */
export const historicalRosterEntries = sqliteTable("historical_roster_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id")
    .notNull()
    .references(() => historicalSeasons.id),
  historicalTeamId: integer("historical_team_id")
    .notNull()
    .references(() => historicalTeams.id),
  playerName: text("player_name").notNull(),
  jerseyNumber: text("jersey_number"),
  positions: text("positions"),
});

/**
 * Completed games from the archive. Scores are nullable because the source
 * lists scheduled-but-unplayed games too. `playedOn` is kept as the source's
 * display string rather than a parsed date - the export has no year-safe
 * format and nothing here needs date arithmetic.
 */
export const historicalGames = sqliteTable("historical_games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Source system id, so per-game stats can be attached without relying on
  // row ordering.
  sourceGameId: text("source_game_id"),
  seasonId: integer("season_id")
    .notNull()
    .references(() => historicalSeasons.id),
  playedOn: text("played_on"),
  startTime: text("start_time"),
  awayTeamId: integer("away_team_id").references(() => historicalTeams.id),
  homeTeamId: integer("home_team_id").references(() => historicalTeams.id),
  awayScore: integer("away_score"),
  homeScore: integer("home_score"),
  // e.g. "7th" when a game was called early.
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Runs per inning for one team in one game, plus the R/H/E summary. `innings`
 * is a comma-separated list because game length varies (and the source uses
 * blanks for innings a team didn't bat in).
 */
export const historicalLineScores = sqliteTable("historical_line_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => historicalGames.id),
  isHome: integer("is_home", { mode: "boolean" }).notNull(),
  teamLabel: text("team_label").notNull(),
  innings: text("innings"),
  runs: integer("runs"),
  hits: integer("hits"),
  errors: integer("errors"),
});

/** One player's batting or pitching line for a single game. */
export const historicalGameStats = sqliteTable("historical_game_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => historicalGames.id),
  isHome: integer("is_home", { mode: "boolean" }).notNull(),
  kind: text("kind").notNull(), // "BATTING" | "PITCHING"
  playerName: text("player_name").notNull(),
  atBats: integer("at_bats"),
  runs: integer("runs"),
  hits: integer("hits"),
  doubles: integer("doubles"),
  triples: integer("triples"),
  homeRuns: integer("home_runs"),
  rbis: integer("rbis"),
  walks: integer("walks"),
  strikeouts: integer("strikeouts"),
  hitByPitch: integer("hit_by_pitch"),
  stolenBases: integer("stolen_bases"),
  caughtStealing: integer("caught_stealing"),
  sacFlies: integer("sac_flies"),
  sacBunts: integer("sac_bunts"),
  leftOnBase: integer("left_on_base"),
  /** One per play, as the league scores them - no assists. */
  putouts: integer("putouts"),
  errors: integer("errors"),
  /**
   * Defensive outs served at each position in this game, as a JSON object
   * keyed by position. Kept per game rather than summed so that a corrected or
   * un-approved game takes its share back out again, and so a player's primary
   * position is decided by time on the field rather than by how many lineup
   * cards happen to list them somewhere.
   */
  positionOuts: text("position_outs"),
  inningsPitched: real("innings_pitched"),
  earnedRuns: integer("earned_runs"),
  hitsAllowed: integer("hits_allowed"),
  runsAllowed: integer("runs_allowed"),
  homeRunsAllowed: integer("home_runs_allowed"),
  strikeoutsPitched: integer("strikeouts_pitched"),
  walksAllowed: integer("walks_allowed"),
  gamesStarted: integer("games_started"),
  completeGames: integer("complete_games"),
  shutouts: integer("shutouts"),
  wins: integer("wins"),
  losses: integer("losses"),
  saves: integer("saves"),
  blownSaves: integer("blown_saves"),
});

// Append-only trail for anything correction-worthy: scorecard approvals and
// edits, roster moves, role/user changes. `detail` is a free-form JSON string
// (kept as text since D1/sqlite has no native JSON type).
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actingUserId: integer("acting_user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  detail: text("detail"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Minecraft identity for a name that appears in the archive. Stat rows record
 * whatever username a player used at the time, and usernames change - the UUID
 * does not, so avatars keep resolving after a rename.
 *
 * Keyed by the archived name rather than by player, because the archive has no
 * player table: a name is all a historical stat line carries.
 */
export const minecraftProfiles = sqliteTable("minecraft_profiles", {
  playerName: text("player_name").primaryKey(),
  uuid: text("uuid").notNull(),
  /** The account's name today, which may differ from playerName. */
  currentName: text("current_name").notNull(),
  /** How the mapping was established: "mojang", "namemc" or "user". */
  source: text("source").notNull(),
});

/**
 * Who is in a game and where they play. One row per player involved, for both
 * sides of one scorecard.
 *
 * A pitcher who bats holds a battingOrder like anyone else. Under a DH the
 * pitcher gets a row with no battingOrder - they field but never hit - and the
 * DH's row carries dhForPlayerId pointing at them, which is the extra entry the
 * scoresheet asks for.
 */
export const scorecardLineups = sqliteTable("scorecard_lineups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scorecardId: integer("scorecard_id")
    .notNull()
    .references(() => scorecards.id),
  isHome: integer("is_home", { mode: "boolean" }).notNull(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  /** 1-9, or null for someone who fields but does not bat. */
  battingOrder: integer("batting_order"),
  /** Scorekeeping position: P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH. */
  position: text("position").notNull(),
  /** The fielder this DH bats for. Only set on a DH row. */
  dhForPlayerId: integer("dh_for_player_id").references(() => players.id),
  /** False for anyone who entered as a substitute. */
  isStarter: integer("is_starter", { mode: "boolean" }).notNull().default(true),
  /** Order pitchers took the mound: 1 for the starter, then 2, 3 ... */
  pitchingOrder: integer("pitching_order"),
  /**
   * The at-bat count at which this player walked off the field, or null while
   * they are out there.
   *
   * This is not a substitution - nobody came in for them - and not a position
   * change either, since they are not standing anywhere. They keep their
   * lineup row and their place in the batting order, because in this league
   * they usually come back: their turn is skipped while they are gone, and
   * putting them back on clears this and hands them a position again.
   */
  leftAtSequence: integer("left_at_sequence"),
});

/**
 * One plate appearance. This is the source of truth for a scored game - every
 * batting and pitching total is derived from these rows, so a correction here
 * fixes the box score, the player's season line and the standings at once.
 *
 * `fielders` holds the scorekeeping digits ("7" for a fly to left, "4-3" for
 * second to first), which is how the sheet already credits a putout.
 */
export const plateAppearances = sqliteTable("plate_appearances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scorecardId: integer("scorecard_id")
    .notNull()
    .references(() => scorecards.id),
  /** Ordering within the game; gaps are fine, ties are not. */
  sequence: integer("sequence").notNull(),
  inning: integer("inning").notNull(),
  /** True while the home team bats - the bottom of the inning. */
  isHomeBatting: integer("is_home_batting", { mode: "boolean" }).notNull(),
  batterPlayerId: integer("batter_player_id")
    .notNull()
    .references(() => players.id),
  /**
   * The order slot this play belongs to, fixed when it is recorded. Looking it
   * up from the lineup by the batter id only holds while the lineup never
   * changes: a substitution takes the slot with it, and every at-bat the
   * replaced player had already taken would fall out of the scorecard.
   */
  battingSlot: integer("batting_slot"),
  /**
   * Who is credited with the out. The league scores one putout per play and
   * no assists, so a groundout to short credits the shortstop rather than the
   * first baseman who took the throw.
   */
  putoutPlayerId: integer("putout_player_id").references(() => players.id),
  pitcherPlayerId: integer("pitcher_player_id")
    .notNull()
    .references(() => players.id),
  /** K, BB, HBP, 1B, 2B, 3B, HR, GO, FO, LO, PO, FC, DP, SF, SH, E, OTHER. */
  result: text("result").notNull(),
  fielders: text("fielders"),
  rbis: integer("rbis").notNull().default(0),
  /** Whether the batter themselves came round to score. */
  batterScored: integer("batter_scored", { mode: "boolean" }).notNull().default(false),
  /** Runners other than the batter who scored on this play. */
  otherRunsScored: integer("other_runs_scored").notNull().default(0),
  /** Runs on this play that were unearned, for the pitcher's ERA. */
  unearnedRuns: integer("unearned_runs").notNull().default(0),
  outsRecorded: integer("outs_recorded").notNull().default(0),
  /** Position number charged with an error on this play, if any. */
  errorPosition: integer("error_position"),
  errorPlayerId: integer("error_player_id").references(() => players.id),
  stolenBases: integer("stolen_bases").notNull().default(0),
  /**
   * Which runners did the stealing, as a JSON array of player ids.
   *
   * A steal is recorded against the play that was standing when it happened,
   * and the man who stole is almost never the man at bat - so a count alone
   * gets credited to the wrong player. Empty on an older row, which falls back
   * to the batter.
   */
  stolenBy: text("stolen_by"),
  /**
   * Who stood on first, second and third when this play ended, as a JSON array
   * of three player ids or nulls.
   *
   * Storing the runners rather than a count of runs is what lets the scorer
   * infer instead of ask: with nobody on, a single cannot drive anyone in, so
   * there is no RBI question. It also lets the diamond show real names, and
   * makes an edited at-bat recoverable, since the next play's starting bases
   * are simply the previous play's ending ones.
   */
  basesAfter: text("bases_after"),
  /** Player ids of runners who scored on this play, excluding the batter. */
  runnersScored: text("runners_scored"),
  note: text("note"),
});

/**
 * Where each fielder stood, recorded as changes rather than as a running
 * lineup. The starting positions come from scorecard_lineups; every later
 * rearrangement is one row here, applied in order.
 *
 * Storing changes rather than a current alignment means the card can answer
 * "who was at short in the fourth?" after the fact - which a single mutable
 * position column could not.
 */
export const fieldingChanges = sqliteTable("fielding_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scorecardId: integer("scorecard_id")
    .notNull()
    .references(() => scorecards.id),
  /** The fielding team, not the batting one. */
  isHome: integer("is_home", { mode: "boolean" }).notNull(),
  /** The inning the change took effect in. */
  inning: integer("inning").notNull(),
  /**
   * The at-bat count when the change was confirmed. Changes mid-inning are
   * real, so an inning number alone cannot order them.
   */
  appliedAtSequence: integer("applied_at_sequence").notNull(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  position: text("position").notNull(),
});

/**
 * A runner retired between plays - tagged out, picked off, or caught stealing.
 *
 * Not a plate appearance: nobody batted, so recording one as an at-bat would
 * give a player a turn at the plate they never took. It hangs off the play
 * that was standing when it happened, which is what puts it in the right
 * inning.
 */
export const runnerOuts = sqliteTable("runner_outs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scorecardId: integer("scorecard_id")
    .notNull()
    .references(() => scorecards.id),
  plateAppearanceId: integer("plate_appearance_id")
    .notNull()
    .references(() => plateAppearances.id),
  runnerPlayerId: integer("runner_player_id")
    .notNull()
    .references(() => players.id),
  /** TAGGED, PICKED_OFF, CAUGHT_STEALING. */
  kind: text("kind").notNull(),
  /** The base they were on, or heading for on a caught stealing. */
  base: text("base").notNull(),
  putoutPlayerId: integer("putout_player_id").references(() => players.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * What the umpire did, in order, with enough of the old state to put it back.
 *
 * Scoring a live game is done in a hurry and half of it is irreversible by
 * hand: a pitching change rewrites who every later at-bat is charged to, a
 * substitution takes a lineup slot with it, moving a runner rewrites the
 * standing play's runs. Asking an umpire to reconstruct that from memory is
 * how a card ends up quietly wrong.
 *
 * Rather than an inverse operation per action - seven of them, each able to
 * drift from the thing it undoes - every action snapshots the rows it is about
 * to touch and names the rows it created. Undo restores the one and deletes
 * the other, so it works the same way whatever was done.
 */
export const scorecardActions = sqliteTable("scorecard_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scorecardId: integer("scorecard_id")
    .notNull()
    .references(() => scorecards.id),
  /** AT_BAT, AT_BAT_EDIT, RUNNER_MOVE, RUNNER_OUT, SUBSTITUTION, POSITION_CHANGE, PITCHING_CHANGE, LEFT_FIELD, RETURNED_TO_FIELD. */
  kind: text("kind").notNull(),
  /** Shown on the undo button, so the umpire knows what is about to go. */
  summary: text("summary").notNull(),
  /** JSON: rows to put back, and rows to delete. See db/undo.ts. */
  payload: text("payload").notNull(),
  /** Cleared when undone, so the trail stays but is not undone twice. */
  undoneAt: text("undone_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
