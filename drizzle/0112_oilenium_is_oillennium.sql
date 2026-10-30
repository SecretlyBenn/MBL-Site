-- `Oilenium` and `oillennium` are one man, and this adds his two lines together.
--
-- A merge rather than a rename, because both names are filed under the same
-- club in the same season: the Bandits in MCBA Season XII Pre-season. Whoever
-- typed the two cards spelled him one way in November and another in December,
-- and the archive, which is keyed by name, duly opened a second career for him.
--
-- The check that says these are not two people: they never appear in the same
-- game. `Oilenium` batted at the Cacti on 17 November and `oillennium` at the
-- Sentinels on 1 December, both for the Bandits, both 0 for 2. Two names in one
-- box score would have proved the opposite and this file would not exist.
--
-- `oillennium` is the name that survives because it is the one his account
-- carries today - Mojang answers `oillennium` for `82ea9886681d430482000dcf0b725f4c`,
-- which is the profile row this site already holds. `Oilenium` has no profile
-- at all, which is why his half of the season showed a blank head.
--
-- The surviving season line is the two added together, not one of them: two
-- games, four at-bats, three strikeouts, four plate appearances, one putout.
-- Every rate stays zero because he never reached base, and the fielding
-- percentage becomes one putout out of one chance, which is what a recompute
-- would derive for him anyway, so clicking Recompute afterwards is a no-op.
--
-- Both `players` rows were bare free agents with nothing pointing at them - no
-- roster spot, no move, no scorecard - so the spare one is simply removed
-- rather than repointed.
--
-- Values are set rather than added to, and the deletes match nothing on a
-- second pass, so running this twice is the same as running it once.
UPDATE historical_player_stats
SET games = 2,
    at_bats = 4,
    plate_appearances = 4,
    strikeouts = 3,
    putouts = 1,
    errors = 0,
    fielding_pct = 1.0,
    batting_average = 0,
    on_base_pct = 0,
    slugging_pct = 0,
    ops = 0
WHERE player_name = 'oillennium' AND season_id = 38 AND historical_team_id = 325;

DELETE FROM historical_player_stats
WHERE player_name = 'Oilenium' AND season_id = 38 AND historical_team_id = 325;

DELETE FROM historical_roster_entries
WHERE player_name = 'Oilenium' AND season_id = 38 AND historical_team_id = 325;

UPDATE historical_game_stats SET player_name = 'oillennium' WHERE player_name = 'Oilenium';

DELETE FROM players WHERE display_name = 'Oilenium';
