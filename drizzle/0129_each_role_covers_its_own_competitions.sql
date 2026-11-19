-- A role at a time, not an account at a time.
--
-- `user_leagues` said which competitions an account's roles covered, as one
-- set for all of them. That was right while the only scoped roles were the
-- two umpiring ones, which the same people do in both competitions. It is
-- wrong now that a writer is scoped too: somebody who umpires the MBL and
-- writes for the MCBA had one set to put both in, and whichever they chose
-- was wrong about the other.
--
-- So a row is now about one role. No rows for a role still means that role
-- covers every competition, which is what almost everybody is, and it is
-- still stored as what somebody covers rather than what they do not - a
-- competition added to `leagues` tomorrow is covered without anyone being
-- re-ticked.
--
-- The table is rebuilt rather than altered because the one row in it has to
-- become one row per scoped role its account holds, and because the unique
-- index has to change. There is exactly one row today (Bandelly, the MBL),
-- and the expansion below turns it into one UMPIRE row - the GM half of that
-- account is not scoped, because a GM takes their competition from the club
-- they manage.

CREATE TABLE IF NOT EXISTS user_leagues_new (
  id integer PRIMARY KEY AUTOINCREMENT,
  user_id integer NOT NULL REFERENCES users (id),
  -- Which role this covers. UMPIRE, HEAD_UMPIRE or WRITER: the roles with no
  -- club of their own. An admin runs everything and a GM takes their
  -- competition from their club, so neither is ever written here.
  role text NOT NULL,
  league_id integer NOT NULL REFERENCES leagues (id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Every scoped role the account holds gets what the account used to say, so
-- nobody's access changes today - this changes what is possible, not what is
-- currently true.
INSERT INTO user_leagues_new (user_id, role, league_id)
SELECT ul.user_id, r.role, ul.league_id
FROM user_leagues ul
JOIN user_roles r
  ON r.user_id = ul.user_id
 AND r.role IN ('UMPIRE', 'HEAD_UMPIRE', 'WRITER');

DROP TABLE IF EXISTS user_leagues;
ALTER TABLE user_leagues_new RENAME TO user_leagues;

CREATE UNIQUE INDEX IF NOT EXISTS user_leagues_unique ON user_leagues (user_id, role, league_id);
CREATE INDEX IF NOT EXISTS user_leagues_user_idx ON user_leagues (user_id);
