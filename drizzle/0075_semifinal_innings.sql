-- The same innings-pitched correction, for the semifinals.
--
-- Applied once the league confirmed it wanted the figures corrected. It changes
-- numbers that had already been published, which is why it waited to be asked.
--
-- Sixteen pitching lines across the Season XII semifinals were entered in
-- baseball notation by hand, the way 0072 was before 0074 corrected it. The
-- site stores `outs / 3`, so a line entered as 6.2 is read as six innings and
-- six tenths of an out: Drypho's 6.2 shows on the site as "6.1" and IcedFlame's
-- 6.1 shows as a flat "6". The ERA on the playoff leaderboards divides by this
-- figure, so it is out by the same amount.
--
-- Nothing else in the archive is affected: of 4,585 pitching lines, 4,567 are
-- already whole innings or proper thirds. These eighteen were the only ones,
-- and two of them were this week's and are fixed.
UPDATE historical_game_stats
SET innings_pitched = CAST(innings_pitched AS INTEGER)
                    + ROUND(innings_pitched - CAST(innings_pitched AS INTEGER), 1) * 10.0 / 3.0
WHERE kind = 'PITCHING'
  AND ROUND(innings_pitched - CAST(innings_pitched AS INTEGER), 4) IN (0.1, 0.2);
