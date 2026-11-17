-- Sign-ups, a clock, and rounds that belong to one competition.
--
-- Four things a real draft night needs that the first version did not have.
--
-- Running this twice is not a no-op the way the rest are, because SQLite has
-- no ADD COLUMN IF NOT EXISTS. It is still safe: D1 rolls a whole file back
-- when a statement fails, so the second run stops at the first ALTER with
-- "duplicate column name" having changed nothing. A failure here means it had
-- already gone through - check the columns before deciding it did not.

-- How long a club has to make a pick, in seconds. Null is no clock at all,
-- which is what a draft that does not want one leaves it as. Running out does
-- nothing on purpose: it is there so everybody can see who is holding the
-- draft up, not to pick for them.
ALTER TABLE drafts ADD COLUMN pick_seconds integer;

-- When an admin started it. Null means it has not begun, and until it has
-- nobody can pick - a board set up a week early should not be draftable from
-- the moment it exists. It is also where the first pick's clock counts from.
ALTER TABLE drafts ADD COLUMN started_at text;

-- Whether players may put their names down. Opened and closed by an admin, so
-- the pool stops moving before the draft starts.
ALTER TABLE drafts ADD COLUMN signups_open integer NOT NULL DEFAULT 0;

-- Where the pool comes from: ALL is everybody the competition could draft,
-- SIGNUPS is only the players who put their names down. Defaulted to ALL so
-- the drafts that exist today behave exactly as they did.
ALTER TABLE drafts ADD COLUMN pool_source text NOT NULL DEFAULT 'ALL';

-- A round that may only take one competition's players.
--
-- The off-season tournament borrows from both, and a league running one often
-- wants the rounds split - two rounds of MBL men, then two of college players.
-- A round with no row here may take anybody, which is what every round of
-- every existing draft does.
CREATE TABLE IF NOT EXISTS draft_rounds (
  id integer PRIMARY KEY AUTOINCREMENT,
  draft_id integer NOT NULL REFERENCES drafts (id),
  round integer NOT NULL,
  league_id integer NOT NULL REFERENCES leagues (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS draft_rounds_unique ON draft_rounds (draft_id, round);

-- Who has put their name down.
--
-- Signing up needs a Discord account and nothing else - no league role, no row
-- in `users` - because the people signing up are players, and the site has
-- never had accounts for them. What it does not have either is a Discord id
-- for a player, so the sign-up records the name they give and the player it
-- matched, and leaves the match empty when there is none rather than inventing
-- a player. An admin sorts those out: a man who has never played here has
-- nothing to match, and a typo should not open a second career for somebody
-- who already has one.
CREATE TABLE IF NOT EXISTS draft_signups (
  id integer PRIMARY KEY AUTOINCREMENT,
  draft_id integer NOT NULL REFERENCES drafts (id),
  -- Discord's id for whoever signed up. The stable identity: names change.
  discord_id text NOT NULL,
  -- What Discord calls them, kept so an admin has something to recognise.
  discord_name text NOT NULL,
  -- The name they gave for themselves in game.
  typed_name text NOT NULL,
  -- The player that name matched, if it matched one.
  player_id integer REFERENCES players (id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One sign-up each. Somebody changing the name they gave edits the row they
-- already have rather than adding another.
CREATE UNIQUE INDEX IF NOT EXISTS draft_signups_once ON draft_signups (draft_id, discord_id);

CREATE INDEX IF NOT EXISTS draft_signups_draft_idx ON draft_signups (draft_id);
