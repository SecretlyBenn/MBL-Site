-- The bench a side names before the game, and who is allowed to come on.
--
-- An MBL club names up to five players with its lineup and only those five
-- may enter the game. A college club does not: its roster turns up as it turns
-- up, so there a substitution can still bring in anybody on it.
--
-- The limit goes on the league row rather than into the code, which is where
-- innings_per_game and has_minor_league already live and for the same reason -
-- a constant here recomputed every MCBA pitcher's ERA a fifth too high once.
-- Null means no bench is declared and anyone on the roster can come on, which
-- is what the MCBA gets and what every card saved before this keeps.
ALTER TABLE leagues ADD COLUMN bench_limit INTEGER;

UPDATE leagues SET bench_limit = 5 WHERE slug = 'mbl';

-- Up to five rows a side. Not part of scorecard_lineups on purpose: a bench
-- player holds no place in the order and stands nowhere, so he has no batting
-- order and no position, and putting him there would mean every check that
-- reads a lineup - the shortest order that can play, one starting pitcher, two
-- men in one position - having to know to skip him.
CREATE TABLE IF NOT EXISTS scorecard_bench (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scorecard_id INTEGER NOT NULL REFERENCES scorecards(id),
  is_home INTEGER NOT NULL,
  player_id INTEGER NOT NULL REFERENCES players(id)
);

-- One row per player per side, and the lookup is always "this card, this
-- side", which is what the substitution panel and the substitute route ask.
CREATE UNIQUE INDEX IF NOT EXISTS scorecard_bench_unique
  ON scorecard_bench (scorecard_id, is_home, player_id);
