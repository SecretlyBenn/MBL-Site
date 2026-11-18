-- The eleven men the Expos were carrying here after the bot let them go.
--
-- The club that was the Expos is club 9, renamed to the Seattle Sasquatch.
-- Its roster was emptied in the bot, which is what the league believes, and
-- the site never heard: the bot's Discord commands push every move to
-- /api/bot/roster-move, and its web panel does not import `notify` at all, so
-- a roster edited through the panel is a roster the site goes on showing.
--
-- So this is the push that never came, written by hand. A release is what the
-- bot would have sent: no club, and FREE_AGENT rather than ACTIVE, which is
-- the status `applyMove` gives a released man and the one that puts him back
-- in the pool to be signed again.
--
-- Nobody is deleted and nothing is invented. If the bot has since put any of
-- them on another club, its next push for that man corrects this - which is
-- the right way round, because the bot is the record and this file is only
-- catching the site up to it.
--
-- Running it twice is the same as running it once: the second run finds
-- nobody on club 9.

UPDATE players
SET team_id = NULL, status = 'FREE_AGENT'
WHERE team_id = 9;

-- Written down the way a release is, so the club's history says where these
-- men went rather than them simply being gone from it one day. `team_id` is
-- null on a release, the same as the route writes, and the bot's own account
-- is who did it, because this is the push it would have sent - and
-- `acting_user_id` cannot be null, which is the constraint that caught a
-- first attempt to leave it blank.
INSERT INTO roster_moves (player_id, team_id, move_type, acting_user_id, note)
SELECT p.id, NULL, 'RELEASE', 13, 'Released in the bot; the site was not told'
FROM players p
WHERE p.team_id IS NULL
  AND p.status = 'FREE_AGENT'
  AND p.id IN (158, 207, 212, 401, 776, 218, 102, 234, 167, 241, 690)
  AND NOT EXISTS (
    SELECT 1 FROM roster_moves m
    WHERE m.player_id = p.id
      AND m.note = 'Released in the bot; the site was not told'
  );
