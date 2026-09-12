-- Playoff games were created straight into the live `games` table with fixed
-- dates, which put all twelve into the umpire claiming list at once and left
-- no way to agree a time. Regular-season games work the other way round: the
-- fixture lives in the archive, a club arranges a date for it, and only then
-- does a live game exist for an umpire to claim.
--
-- Arranging a fixture requires it to carry a source_game_id - that is the key
-- /api/games/schedule looks it up by - and the playoff fixtures had none. These
-- ids are ours rather than MyStatsOnline's, prefixed so a later import cannot
-- mistake them for scraped ones.
UPDATE historical_games
SET source_game_id = 'XIIPO-' || sort_order
WHERE season_id = 16
  AND source_game_id IS NULL;

-- The pre-made live rows are unlinked duplicates of those fixtures. Dropping
-- them clears the claiming list; each comes back, linked, once its date is
-- agreed. Anything an umpire has already started scoring is left alone.
DELETE FROM games
WHERE id BETWEEN 55 AND 66
  AND source_game_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM scorecards s WHERE s.game_id = games.id);
