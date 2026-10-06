-- Innings pitched are stored as a decimal, not as baseball notation.
--
-- `derive-box-score.ts` writes `outs / 3`, so three and a third innings is
-- 3.3333 and `formatInnings` turns that back into "3.1" for display. 0072 wrote
-- 3.1 and 1.2 straight off the statsheet, which the formatter then read as
-- three innings and a third of an out: Ethan's line showed as a flat 3 and
-- Little's 1.2 came out as 1.1. It also puts the ERA out, which divides by this.
--
-- The arithmetic does the conversion rather than eighteen typed decimals: a
-- tenth is a third of an inning, two tenths are two thirds.
UPDATE historical_game_stats
SET innings_pitched = CAST(innings_pitched AS INTEGER)
                    + ROUND(innings_pitched - CAST(innings_pitched AS INTEGER), 1) * 10.0 / 3.0
WHERE kind = 'PITCHING'
  AND game_id = (SELECT id FROM historical_games WHERE source_game_id = 'WS-G1')
  AND ROUND(innings_pitched - CAST(innings_pitched AS INTEGER), 4) IN (0.1, 0.2);
