-- Rounds that run in whichever direction the league says, and sign-ups from
-- people the site has never seen.
--
-- Running this twice stops at the first ALTER with "duplicate column name"
-- having changed nothing, the same as 0124. SQLite has no ADD COLUMN IF NOT
-- EXISTS and D1 rolls a whole file back when a statement fails.

-- Which competition somebody is signing up for. The point of asking is the
-- people who have never played here: there is no player row to read it off,
-- so they have to say, or nobody knows which pool they belong in.
ALTER TABLE draft_signups ADD COLUMN league_id integer REFERENCES leagues (id);

-- What they can play, comma separated, from the same list a lineup uses.
-- A general manager drafting a stranger has nothing else to go on.
ALTER TABLE draft_signups ADD COLUMN positions text;

-- `draft_rounds` is rebuilt rather than altered.
--
-- It was created in 0124 with a competition that every row had to carry, and
-- a round now wants to say which direction it runs in without naming a
-- competition at all. SQLite cannot drop a NOT NULL without rebuilding the
-- table, and the table is empty on both databases - no draft has ever used
-- one - so rebuilding it loses nothing. If that is ever not true, copy the
-- rows out first.
DROP TABLE IF EXISTS draft_rounds;

CREATE TABLE IF NOT EXISTS draft_rounds (
  id integer PRIMARY KEY AUTOINCREMENT,
  draft_id integer NOT NULL REFERENCES drafts (id),
  round integer NOT NULL,
  -- Null takes anybody in the pool.
  league_id integer REFERENCES leagues (id),
  -- Null follows the draft's mode: straight runs the order as entered every
  -- round, a snake turns it round on the even ones. Set, it overrules that for
  -- this round alone - 1 reversed, 0 as entered.
  --
  -- There is a round pattern in use that no mode describes: four rounds of
  -- forward, reversed, reversed, forward, repeating. Rather than add a third
  -- mode for it and a fourth for whatever comes next, a round says which way
  -- it runs and the admin page has a button that repeats the first few across
  -- the rest.
  reversed integer
);

CREATE UNIQUE INDEX IF NOT EXISTS draft_rounds_unique ON draft_rounds (draft_id, round);
