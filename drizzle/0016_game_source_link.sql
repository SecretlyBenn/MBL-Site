-- A live game can stand for a game the archive already knows about: Season XII
-- is mid-season, so its remaining fixtures exist as unplayed historical rows
-- that umpires now score. Carrying the archive's id on the live row lets
-- publishing fill that row in rather than appending a duplicate beside it.
ALTER TABLE games ADD COLUMN source_game_id text;
CREATE UNIQUE INDEX games_source_game_id_unique ON games (source_game_id) WHERE source_game_id IS NOT NULL;
