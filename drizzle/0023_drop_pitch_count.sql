-- Nobody counts pitches in this league, so the column was never going to hold
-- anything. It was summing into career totals as a permanent zero and taking
-- up a slot in every stat query for it.
ALTER TABLE historical_player_stats DROP COLUMN pitch_count;
