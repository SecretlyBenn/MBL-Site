-- Who was on base when a play ended, so the scorer can infer rather than ask.
--
-- Runs used to be stored as an anonymous count, which meant the screen had to
-- ask how many runners scored even with the bases empty. Holding the runners
-- themselves lets a single with nobody on skip the question entirely, lets the
-- diamond show real names, and makes an edit recoverable - the next play's
-- starting bases are the previous play's ending ones.
ALTER TABLE plate_appearances ADD COLUMN bases_after text;
ALTER TABLE plate_appearances ADD COLUMN runners_scored text;
