-- An account can hold more than one role.
--
-- users.role was a single column, which decided by accident that nobody could
-- be two things at once. In a league this size most officials are: a GM who
-- umpires other clubs' games is the ordinary case, and the single column made
-- the league choose between letting them score and letting them run a roster.
--
-- Every existing account keeps exactly the role it had - this changes what is
-- possible, not what is currently true.

CREATE TABLE IF NOT EXISTS user_roles (
  id integer PRIMARY KEY AUTOINCREMENT,
  user_id integer NOT NULL REFERENCES users (id),
  role text NOT NULL,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One row per role per account. The guards read this table with an IN (...),
-- so a duplicate would be harmless but would make the admin page show a role
-- twice.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique ON user_roles (user_id, role);

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles (user_id);

INSERT OR IGNORE INTO user_roles (user_id, role)
SELECT id, role FROM users WHERE role IS NOT NULL AND role <> '';

-- Dropped rather than left behind. A column that still holds the old answer is
-- exactly the kind of thing someone reads six months from now and believes -
-- and the whole point is that it can no longer say the whole truth.
--
-- If a SQLite version somewhere refuses this, everything above has already
-- applied and the site is correct; the column is then simply unused and can be
-- dropped later.
ALTER TABLE users DROP COLUMN role;
