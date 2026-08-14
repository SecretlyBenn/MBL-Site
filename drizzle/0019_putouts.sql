-- Who is credited with the out on a play.
--
-- The league scores a single putout per play and does not use assists: a
-- groundout to short credits the shortstop, not the first baseman who caught
-- the throw. A tag credits whoever applied it, a caught stealing credits the
-- catcher, a pickoff the pitcher, and a strikeout nobody.
--
-- Held per play rather than tallied per player so it can be corrected: an
-- at-bat is editable at any point, and a running total could not be walked
-- back.
ALTER TABLE plate_appearances ADD COLUMN putout_player_id integer REFERENCES players(id);

-- A runner retired between plays - tagged out, picked off, caught stealing.
-- These are not plate appearances: nobody batted, so recording one as an
-- at-bat would give a player a turn they never took.
CREATE TABLE runner_outs (
  id integer PRIMARY KEY AUTOINCREMENT,
  scorecard_id integer NOT NULL REFERENCES scorecards(id),
  -- The play standing when it happened, so the out lands in the right inning.
  plate_appearance_id integer NOT NULL REFERENCES plate_appearances(id),
  runner_player_id integer NOT NULL REFERENCES players(id),
  -- TAGGED, PICKED_OFF, CAUGHT_STEALING.
  kind text NOT NULL,
  -- The base they were on, or heading for on a caught stealing.
  base text NOT NULL,
  putout_player_id integer REFERENCES players(id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX runner_outs_scorecard ON runner_outs (scorecard_id);
