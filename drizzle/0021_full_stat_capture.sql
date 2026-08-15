-- Every column the batting and pitching tabs show, carried from the umpire's
-- scorecard through to the season totals. The per-game table was missing most
-- of the fielding and pitching-decision fields, so those columns could only
-- ever be blank for a live-scored game no matter what the umpire entered.
ALTER TABLE historical_game_stats ADD COLUMN hit_by_pitch INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN stolen_bases INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN caught_stealing INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN sac_flies INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN sac_bunts INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN left_on_base INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN errors INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN position_outs TEXT;
ALTER TABLE historical_game_stats ADD COLUMN home_runs_allowed INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN games_started INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN complete_games INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN shutouts INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN wins INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN losses INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN saves INTEGER;
ALTER TABLE historical_game_stats ADD COLUMN blown_saves INTEGER;

ALTER TABLE historical_player_stats ADD COLUMN hit_by_pitch INTEGER;

-- A steal belongs to the runner, not to whoever was at the plate when it
-- happened. Without this the base was counted, against the wrong player.
ALTER TABLE plate_appearances ADD COLUMN stolen_by TEXT;
