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
  email: text("email").notNull().unique(),
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
  // franchise name where known (e.g. "EXTExpos" -> "Montreal Expos").
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  // Exactly as it appeared in the source export, so a re-import can still match.
  sourceName: text("source_name").notNull(),
  sourceTeamId: text("source_team_id").notNull(),
  wins: integer("wins"),
  losses: integer("losses"),
  ties: integer("ties"),
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
