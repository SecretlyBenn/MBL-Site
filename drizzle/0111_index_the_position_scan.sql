-- Stop reading the whole game archive to answer "what position does he play".
--
-- `getPrimaryPositions` asks for every row of `historical_game_stats` that
-- carries a `position_outs` blob. About three hundred do. There was no index
-- on the column, so answering it meant walking all 27,606 rows and throwing
-- away ninety-nine percent of them - 745,362 rows read across a single day,
-- the largest single line in the whole database's usage, for a few hundred
-- rows of answer.
--
-- A partial index over just the rows that have the column, carrying the name
-- beside it, so the query is answered out of the index without touching the
-- table at all.
--
-- `IF NOT EXISTS` makes this free to run twice.
CREATE INDEX IF NOT EXISTS historical_game_stats_position_outs
  ON historical_game_stats (player_name, position_outs)
  WHERE position_outs IS NOT NULL;
