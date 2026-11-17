-- Which competitions an official's roles cover, as a set rather than one.
--
-- `users.league_id` could say "the MBL" or, left null, "all of them", and
-- nothing in between. That was the whole truth while there were two
-- competitions and stopped being it the day there were three: an umpire who
-- calls MBL games and the off-season tournament but not the college league had
-- no way of being described, and the only honest thing the picker could offer
-- him was everything. The label on it said "both leagues", which by then was
-- not even counting right.
--
-- No rows still means every competition, which is what null meant and what
-- almost everybody is - all eighty-three accounts on the live site say nothing
-- at all today. It also has to be stored that way round, as what somebody
-- covers rather than what they do not: a competition added to `leagues`
-- tomorrow is then covered by the officials who cover everything, without
-- anyone remembering to go back and tick eighty-three accounts.
--
-- `users.league_id` is left behind rather than dropped. SQLite refuses to drop
-- a column carrying a foreign key without rebuilding the table, and D1 rolls
-- back a whole file when one statement fails, so attempting it would take the
-- new table down with it. It is emptied instead, so that a column nothing
-- reads any more cannot be read six months from now and believed.

CREATE TABLE IF NOT EXISTS user_leagues (
  id integer PRIMARY KEY AUTOINCREMENT,
  user_id integer NOT NULL REFERENCES users (id),
  league_id integer NOT NULL REFERENCES leagues (id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One row per competition per account. A duplicate would be harmless to the
-- guards, which read this with an IN (...), but would tick a box twice on the
-- admin page - and it is what makes the copy below safe to run again.
CREATE UNIQUE INDEX IF NOT EXISTS user_leagues_unique ON user_leagues (user_id, league_id);

CREATE INDEX IF NOT EXISTS user_leagues_user_idx ON user_leagues (user_id);

-- Whatever the old column said. Nothing on the live site, but the other
-- account's copy is not guaranteed to be as empty.
INSERT OR IGNORE INTO user_leagues (user_id, league_id)
SELECT id, league_id FROM users WHERE league_id IS NOT NULL;

UPDATE users SET league_id = NULL WHERE league_id IS NOT NULL;
