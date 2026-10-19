-- The winning pitcher of MCBA14-CR2.
--
-- The card for that game is the undated, unsigned one, and it names no
-- winning pitcher. The Spiders used two, so the importer would not guess: it
-- reported the gap and left the game without one. The league has settled it -
-- the Spiders led from the first inning and LowTierNormy went 4.2 of the
-- five - so it is recorded here rather than inferred in code.
--
-- The loss needed no deciding: the Beavers used one pitcher, so Lastnarwhal
-- already has it.
--
-- Both the box score and the season line are set, so the figure is right now
-- and a later recompute of season 46 rebuilds the same one from the game.
--
-- The season line is summed from the box scores rather than incremented. An
-- earlier version of this file added one to it, and a `fetch failed` that was
-- a lost response rather than a lost write meant the retry added a second:
-- LowTierNormy finished with two wins in a season he pitched one. A migration
-- that can be retried has to be safe to run twice.

UPDATE historical_game_stats
SET wins = 1
WHERE game_id = 4836 AND kind = 'PITCHING' AND player_name = 'LowTierNormy';

UPDATE historical_player_stats
SET wins = (
  SELECT COALESCE(SUM(s.wins), 0)
  FROM historical_game_stats s
  JOIN historical_games g ON g.id = s.game_id
  WHERE g.season_id = 46
    AND s.kind = 'PITCHING'
    AND s.player_name = 'LowTierNormy'
    AND (CASE WHEN s.is_home THEN g.home_team_id ELSE g.away_team_id END) = 407
)
WHERE season_id = 46 AND historical_team_id = 407 AND player_name = 'LowTierNormy';
