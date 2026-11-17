-- The rounds decide the order, and a round can take more than one
-- competition's players.
--
-- `drafts.mode` said straight or snake, which was the whole answer before a
-- round could say which way it runs. Now that every round says it, the mode
-- is a second place the same question is answered from, and the two can
-- disagree. It goes, rather than being left to be read six months from now and
-- believed. A round that says nothing runs the order as it was entered.
--
-- `draft_rounds` is rebuilt rather than altered: a round now holds a set of
-- competitions and not one, and SQLite cannot turn a column into a list. It is
-- empty on both databases - no draft has ever used one - so rebuilding it
-- loses nothing. If that is ever not true, copy the rows out first.

DROP TABLE IF EXISTS draft_rounds;

CREATE TABLE IF NOT EXISTS draft_rounds (
  id integer PRIMARY KEY AUTOINCREMENT,
  draft_id integer NOT NULL REFERENCES drafts (id),
  round integer NOT NULL,
  -- The competitions this round may take players from, by id, comma
  -- separated. Empty takes anybody in the pool.
  --
  -- A list in a column rather than a row each, because a round is one thing
  -- with two facts about it and `reversed` has to live on exactly one row -
  -- a row per competition would put the direction in two places and let them
  -- disagree. The same shape a sign-up keeps its positions in. The ids are
  -- checked against `leagues` when they are written; a competition being
  -- deleted out from under one is the cost, and that has never happened.
  league_ids text,
  -- Which way round this round runs: 1 reverses the order, anything else runs
  -- it as entered.
  reversed integer
);

CREATE UNIQUE INDEX IF NOT EXISTS draft_rounds_unique ON draft_rounds (draft_id, round);

-- Last, because this is the statement that can be refused: SQLite will not
-- drop a column that is indexed or carries a foreign key, and D1 rolls a whole
-- file back when one fails. `drafts.mode` is neither, and the table is empty,
-- so this is expected to go through - but if a future SQLite refuses it,
-- everything above has already applied and the column is simply unused.
ALTER TABLE drafts DROP COLUMN mode;
