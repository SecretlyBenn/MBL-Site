-- The archive tables carried no indexes, so every lookup was a full scan. That
-- is cheap on a laptop and expensive on D1, which bills by rows read: importing
-- Season XII's box scores read 1.53 million rows to write 6,203, because each
-- of its 2,401 statements scanned all of historical_games to resolve one
-- source_game_id. Two such runs used most of a day's free-tier allowance.
--
-- These cover the joins the site actually makes: schedule and game pages look
-- games up by season and by id, profiles and leaderboards look stat lines up by
-- player and season.

-- Resolving an archive fixture from its source id - the import's hot path.
CREATE INDEX IF NOT EXISTS historical_games_source_game_id_idx
  ON historical_games (source_game_id);

-- The schedule page reads one season in schedule order.
CREATE INDEX IF NOT EXISTS historical_games_season_sort_idx
  ON historical_games (season_id, sort_order);

-- Box scores and line scores are always fetched for one game.
CREATE INDEX IF NOT EXISTS historical_game_stats_game_id_idx
  ON historical_game_stats (game_id);
CREATE INDEX IF NOT EXISTS historical_line_scores_game_id_idx
  ON historical_line_scores (game_id);

-- A profile gathers one player's lines across seasons; a season page gathers
-- every line in one season.
CREATE INDEX IF NOT EXISTS historical_player_stats_player_idx
  ON historical_player_stats (player_name);
CREATE INDEX IF NOT EXISTS historical_player_stats_season_idx
  ON historical_player_stats (season_id);

-- Per-game stat lines are also read per player, for game-by-game logs.
CREATE INDEX IF NOT EXISTS historical_game_stats_player_idx
  ON historical_game_stats (player_name);

-- Teams are looked up by season when rendering standings and rosters.
CREATE INDEX IF NOT EXISTS historical_teams_season_idx
  ON historical_teams (season_id);
CREATE INDEX IF NOT EXISTS historical_roster_entries_season_idx
  ON historical_roster_entries (season_id);
