-- "MCBA Season XIV" rather than "MCBA XIV", and the playoffs season that was
-- started under the wrong competition goes.
--
-- The MBL's seasons have always been "MBL Season IV" and the MCBA's arrived
-- from MyStatsOnline as "MCBA IX", so the two archives have read differently
-- since the day the second one was imported. The word goes in on the MCBA's
-- side rather than coming out of the MBL's, because the MBL's names are the
-- ones the league writes and reads everywhere else.
--
-- Every season named "MCBA <numeral>" is caught, pre-seasons and playoffs
-- included, so "MCBA X Pre-season" becomes "MCBA Season X Pre-season". The
-- match is on the name rather than on league_id, because the one season this
-- also has to reach is filed under the wrong competition - see below - and
-- nothing the MBL owns is named "MCBA ..." for it to catch by mistake.
--
-- league_settings carries the current season by name, not by id, so it has to
-- move in the same breath. Leaving it would point the MCBA at a season that no
-- longer exists under that name, and the next MCBA game published would have
-- nowhere to be filed - which is exactly what currentSeasonName refuses to
-- guess about.
--
-- The deletion: an "MCBA XIV Playoffs" season was started on the site under
-- the MBL by mistake. Creating a season enters that competition's clubs at
-- 0-0, so it was given the ten MBL clubs - Panthers, Otters, Thunderbirds and
-- the rest - which makes it useless as an MCBA season whatever its name says.
-- It holds no games, no player totals and no roster entries, and nothing
-- outside it points at those ten rows, so it goes and the real one is built
-- fresh in the migration that follows.

DELETE FROM historical_teams WHERE season_id = 45;
DELETE FROM historical_seasons WHERE id = 45;

UPDATE historical_seasons
SET name = 'MCBA Season ' || substr(name, 6)
WHERE name LIKE 'MCBA %' AND name NOT LIKE 'MCBA Season %';

UPDATE league_settings
SET value = 'MCBA Season ' || substr(value, 6)
WHERE key = 'current_season:mcba'
  AND value LIKE 'MCBA %'
  AND value NOT LIKE 'MCBA Season %';
