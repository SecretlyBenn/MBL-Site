-- Which division a live club plays in.
--
-- The archive records this per season on `historical_teams.league`, because
-- the split changes from season to season - the MCBA has run one division,
-- two and three. The live side needs the current one, so standings can be
-- split without reading the archive for it.
--
-- Backfilled from each competition's most recent season: MBL Season XII and
-- MCBA XIV. Nullable because a competition may not be divided at all.
--
--   MBL    AMERICAN, NATIONAL
--   MCBA   Honey Mustang, Horse Radish, and MIBL for the Coyotes, whose
--          affiliate sits under the MCBA on its own.

ALTER TABLE teams ADD COLUMN division text;

UPDATE teams
SET division = (
  SELECT t.league
  FROM historical_teams t
  JOIN historical_seasons s ON s.id = t.season_id
  WHERE t.name = teams.name
    AND s.name = CASE
      WHEN teams.league_id = (SELECT id FROM leagues WHERE slug = 'mbl') THEN 'MBL Season XII'
      ELSE 'MCBA XIV'
    END
  LIMIT 1
)
WHERE division IS NULL;
