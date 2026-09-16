-- Three things the league asked for: a way to end someone's sessions, a
-- ceiling on how fast anything can be done, and settings it can change itself.

-- Sessions are signed cookies, so they cannot be deleted. Each account carries
-- an epoch instead; bumping it turns every cookie written under the old one
-- into a cookie that no longer opens anything.
ALTER TABLE users ADD COLUMN session_epoch INTEGER NOT NULL DEFAULT 0;

-- How often one actor has done one thing lately. See db/rate-limit.ts.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL
);

-- League-wide settings, so things that used to be constants in the code can be
-- changed from the admin page. See db/settings.ts.
CREATE TABLE IF NOT EXISTS league_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The season being played today. Postseason games are being scored now, and
-- the playoffs are their own season.
INSERT INTO league_settings (key, value) VALUES ('current_season', 'MBL Season XII Playoffs')
ON CONFLICT (key) DO NOTHING;
