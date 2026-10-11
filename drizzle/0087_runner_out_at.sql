-- Where a runner was retired, when it is not where he set off from.
--
-- runner_outs.base is the base he was standing on, and undo puts him back
-- there, so it cannot be reused for this. Without a second column the card
-- could only say "tagged at third" about a man who was thrown out at the
-- plate, which is how 0086's out read before it was corrected.
--
-- Null for a pickoff and for a tag on the bag, where the two are the same
-- base, and null on every out recorded before this existed.

ALTER TABLE runner_outs ADD COLUMN out_at TEXT;

-- Game 4's tag-up, the out that prompted this. Girty set off from third and
-- was tagged out at home.
UPDATE runner_outs SET out_at = 'home' WHERE id = 18 AND scorecard_id = 10 AND base = 'third';
