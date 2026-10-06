-- Four cells in the semifinal line scores, brought into line with 0078.
--
-- Taking the batting from MyStatsOnline left four sides where the players no
-- longer added up to the line score printed above them, which is the sort of
-- thing a reader notices immediately. In each case the source's own line score
-- agrees with the source's own players, and ours is the odd one out: twelve of
-- the sixteen sides already matched it exactly.
--
--   4027 away  errors 1 -> 2   both of them now charged to a named fielder
--   4027 home  hits  11 -> 10  the batters only ever came to ten
--   4029 home  errors 0 -> 1
--   4034 home  errors 2 -> 1
--
-- The innings lists are deliberately not touched. Ours are shorter than the
-- source's on two sides because a home team that was ahead did not bat in the
-- last inning, and the archive writes that as a short list where the source
-- pads it with a nought - see how the page renders it as a dash.

UPDATE historical_line_scores SET errors = 2 WHERE game_id = 4027 AND is_home = 0;
UPDATE historical_line_scores SET hits   = 10 WHERE game_id = 4027 AND is_home = 1;
UPDATE historical_line_scores SET errors = 1 WHERE game_id = 4029 AND is_home = 1;
UPDATE historical_line_scores SET errors = 1 WHERE game_id = 4034 AND is_home = 1;
