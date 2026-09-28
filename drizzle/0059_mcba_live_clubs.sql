-- The Collegiate Association's live clubs.
--
-- It has fourteen seasons in the archive and, until now, no clubs on the live
-- side at all - so there was nothing to score an MCBA game against, roster a
-- player into, or give a GM.
--
-- The nine are MCBA XIV's, the most recent season, and both the name and the
-- abbreviation are taken from `historical_teams` rather than made up. The
-- names are the archive's display names, with the source's abbreviation prefix
-- already stripped ("SDS Spiders" -> "Spiders").
--
-- Coyotes (MIBL) is the minor-league affiliate. It is in here because the MiBL
-- sits under the MCBA, which is where its games are played, and it carried a
-- thirty-man roster in MCBA XIV. Drop it if the league does not score it.
--
-- INSERT OR IGNORE, so re-running this changes nothing: teams.name is unique.

INSERT OR IGNORE INTO teams (name, abbreviation, league_id)
SELECT column1, column2, (SELECT id FROM leagues WHERE slug = 'mcba')
FROM (VALUES
  ('Bandits', 'BCB'),
  ('Batsmen', 'WSB'),
  ('Beavers', 'UTB'),
  ('Cacti', 'UMC'),
  ('Coyotes (MIBL)', 'ALC'),
  ('Hitmen', 'UHH'),
  ('Samurai', 'NPU'),
  ('Sentinels', 'VUS'),
  ('Spiders', 'SDS')
);
