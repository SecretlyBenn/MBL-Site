-- Logos uploaded through the admin page.
--
-- The built-in logos are static files matched to a club by the nickname in its
-- name, and that stays the default. An upload overrides it for one club name,
-- which is how a new club gets a crest - or an existing one gets a new crest -
-- without anyone editing code. Keyed by the club's name, lowercased, because
-- the archive knows clubs only by name: an upload for "Florida Riptide" shows
-- on every season that club appears in.
--
-- The image is resized in the browser before upload, so rows stay small.
CREATE TABLE IF NOT EXISTS team_logos (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  team_name text NOT NULL UNIQUE,
  content_type text NOT NULL,
  data text NOT NULL,
  updated_at text NOT NULL
);
