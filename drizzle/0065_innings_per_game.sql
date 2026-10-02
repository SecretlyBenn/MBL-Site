-- How long a game is, per competition.
--
-- The MBL plays six innings and the MCBA plays five, and that is not a
-- cosmetic difference: every innings-based rate is expressed per whole game
-- here rather than per nine, so the length of a game is the divisor in an
-- earned run average and in the walk and strikeout rates beside it.
--
-- Six was a constant in the code, so the site recomputed every MCBA pitcher's
-- ERA a fifth too high. The imported figures settle which is right and they
-- are not ambiguous - of the archive's pitching lines with innings behind
-- them, 524 of the MBL's 525 match the figure worked out over six, and all 490
-- of the MCBA's match the one worked out over five.
--
-- A column rather than a second constant, so a third competition needs a row
-- and not a deploy.
ALTER TABLE leagues ADD COLUMN innings_per_game INTEGER NOT NULL DEFAULT 6;

UPDATE leagues SET innings_per_game = 5 WHERE slug = 'mcba';
