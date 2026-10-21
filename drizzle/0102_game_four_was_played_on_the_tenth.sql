-- World Series Game 4 was played on 10 October, not the 11th.
--
-- The game started at half past ten at night in Philadelphia, which is half
-- past two the next morning in UTC, and `publish` wrote the day with
-- `new Date(scheduledAt).toDateString()` - which asks the machine it runs on
-- what day it is. The Worker runs on UTC, so the game was filed under the
-- following day. A developer's machine is on Eastern and gives the right
-- answer, which is why nothing caught it before it was deployed.
--
-- The fixture's own `scheduled_at` was always right; only the day written
-- into the archive was wrong, and this is the only game it ever reached -
-- every other archive date came from the import, which `publish` leaves
-- alone. The cause is fixed in the same change, in `easternDateString`.
--
-- Game 5, which really was played on the 11th, is left as it is.

UPDATE historical_games
SET played_on = 'Sat Oct 10 2026'
WHERE season_id = 16 AND source_game_id = 'WS-G4';
