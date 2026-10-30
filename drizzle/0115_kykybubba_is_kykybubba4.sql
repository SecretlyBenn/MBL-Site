-- `KyKyBubba` in the MCBA XIV archive is `Kykybubba4`, who signed for the
-- Cacti on the 28th.
--
-- The league's owner says the name has only ever been Kykybubba4, which makes
-- `KyKyBubba` a nickname somebody typed on a card - the ordinary MCBA failure,
-- the same one 0090 cleaned up for twenty-seven of the thirty-six men in those
-- playoffs. The giveaway is the capitals: nobody types their own username that
-- way, and the account that really holds that name has nothing to do with this
-- league.
--
-- This is a rename and not a merge, even though both names existed: Kykybubba4
-- has no line in any of the three archive tables, so there is nothing to add
-- together and no club-season to collide. It is also why the usual "do the two
-- names appear in the same game" test proves nothing here - he has no games
-- under the new name to appear in - so this rests on the league's word, which
-- for a nickname on a hand-entered card is the only evidence there is or ever
-- will be.
--
-- Three stat lines (Samurai and Cacti in MCBA XIV, and the playoffs), fifteen
-- game lines and one roster entry.
UPDATE historical_player_stats   SET player_name = 'Kykybubba4' WHERE player_name = 'KyKyBubba';
UPDATE historical_game_stats     SET player_name = 'Kykybubba4' WHERE player_name = 'KyKyBubba';
UPDATE historical_roster_entries SET player_name = 'Kykybubba4' WHERE player_name = 'KyKyBubba';

-- The release on the 22nd is this man's own history, so it moves with him
-- rather than being thrown away with the row it hangs off. It is also the only
-- thing referring to that row, which is what makes the delete below safe.
--
-- Both statements are guarded because the old account still holds a copy of
-- this database and every migration is applied to both. That copy stopped
-- getting live rosters when the site moved, so Kykybubba4 has no player row
-- there to move the release onto, and without the guard the missing row fails
-- the foreign key and rolls back the archive rename with it. Guarded, the copy
-- does the rename - which is all it is kept for - and leaves its own stale
-- live rows alone.
UPDATE roster_moves SET player_id = 1190
WHERE player_id = 351 AND EXISTS (SELECT 1 FROM players WHERE id = 1190);

-- `242cd030...` is a live Minecraft account that genuinely holds the name
-- KyKyBubba, and it belongs to a stranger. Linking it was the mistake that
-- hides behind a mistyped name: the head looked right, so nothing reported it.
-- Kykybubba4's own account came in with 0113 and is already correct.
DELETE FROM minecraft_profiles WHERE player_name = 'KyKyBubba';

-- The duplicate live player, now that nothing points at it. He is one man with
-- one row, on the Cacti, and the free agent beside him was never real.
DELETE FROM players
WHERE id = 351 AND display_name = 'KyKyBubba'
  AND NOT EXISTS (SELECT 1 FROM roster_moves WHERE player_id = 351);
