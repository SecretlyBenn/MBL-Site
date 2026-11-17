-- The draft.
--
-- A draft is one competition's, so a tournament can hold one over the winter
-- while the MBL holds its own, and the pages reach it the same way every other
-- page does - through `leagues`.
--
-- Every pick is a row from the moment the draft is made, with nobody in it.
-- That is what the order *is*: the slots in the order they will be used, with
-- the snake already folded into them. Whose turn it is becomes the first row
-- with no player, and the alternative - working it out from a round number, a
-- count of picks and a mode every time anybody looks at the page - is the sort
-- of arithmetic that is right until the day somebody changes the order.
--
-- Ten clubs over twenty rounds is two hundred rows, which is nothing to store
-- and one query to read.

CREATE TABLE IF NOT EXISTS drafts (
  id integer PRIMARY KEY AUTOINCREMENT,
  league_id integer NOT NULL REFERENCES leagues (id),
  name text NOT NULL,
  rounds integer NOT NULL,
  -- STRAIGHT runs the order again every round; SNAKE turns it round on the
  -- even ones. The regular season is always straight, the off-season
  -- tournament is whatever the league decides that winter.
  mode text NOT NULL DEFAULT 'STRAIGHT',
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS draft_picks (
  id integer PRIMARY KEY AUTOINCREMENT,
  draft_id integer NOT NULL REFERENCES drafts (id),
  -- Where this pick comes in the whole draft, counting from one. The round is
  -- carried too rather than divided out, because it is what the board is laid
  -- out in and because a round is not always the same number of picks once a
  -- club has been taken out of an order.
  overall integer NOT NULL,
  round integer NOT NULL,
  team_id integer NOT NULL REFERENCES teams (id),
  -- Null until the pick is made. The first of these in `overall` order is the
  -- club on the clock.
  player_id integer REFERENCES players (id),
  made_by_user_id integer REFERENCES users (id),
  made_at text
);

CREATE UNIQUE INDEX IF NOT EXISTS draft_picks_overall ON draft_picks (draft_id, overall);

-- A man is drafted once. SQLite counts nulls as distinct in a unique index, so
-- this leaves every unmade pick alone and refuses the second club to take the
-- same player - two GMs clicking at the same moment is the ordinary way that
-- happens, and the alternative is a draft that has to be unpicked by hand.
CREATE UNIQUE INDEX IF NOT EXISTS draft_picks_player ON draft_picks (draft_id, player_id);

CREATE INDEX IF NOT EXISTS draft_picks_draft_idx ON draft_picks (draft_id, overall);
