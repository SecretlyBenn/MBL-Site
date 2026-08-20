-- The umpire's actions, in order, each carrying enough of the previous state
-- to be put back. Half of what scoring does is irreversible by hand: a
-- pitching change rewrites who later at-bats are charged to, a substitution
-- takes a lineup slot with it, moving a runner rewrites the standing play.
CREATE TABLE IF NOT EXISTS scorecard_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scorecard_id INTEGER NOT NULL REFERENCES scorecards(id),
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL,
  undone_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS scorecard_actions_card
  ON scorecard_actions (scorecard_id, id);
