-- The Jazz were never in Utah, and six clubs have new abbreviations.
--
-- "Utah Jazz" was entered by mistake when the club was added; they have been
-- the Harlem Jazz the whole time. So this is not a rebrand with a date on it,
-- where the old name is what the record should say for the seasons it covers.
-- It is a correction, and the wrong name should not survive anywhere.
--
-- It survives in exactly one place. The archive's statistics, rosters and box
-- scores all point at `historical_teams.id`, so nothing splits when the name
-- changes; `historical_line_scores.team_label` holds the nickname ("Jazz"),
-- which was right either way; the built-in crest is matched on the nickname
-- too, so `jazz.png` is found before and after; there is no uploaded logo
-- override to move; and no article mentions it. The live `teams` row already
-- said Harlem Jazz.
--
-- The abbreviations are the league's own changes, applied to both the live
-- club and every season of the archive so that a club reads the same wherever
-- it appears - the same rule the site already follows for a player, who
-- appears under the name he goes by today in every season he played.
--
-- Keyed on the club's name rather than the old abbreviation, so running this
-- twice does exactly what running it once did.

-- The correction first, so the abbreviation below finds the club under the
-- name it should have had all along.
UPDATE historical_teams SET name = 'Harlem Jazz' WHERE name = 'Utah Jazz';

UPDATE historical_teams SET abbreviation = 'HAR' WHERE name = 'Harlem Jazz';
UPDATE historical_teams SET abbreviation = 'HER' WHERE name = 'Hershey Otters';
UPDATE historical_teams SET abbreviation = 'PHI' WHERE name = 'Philadelphia Panthers';
UPDATE historical_teams SET abbreviation = 'TOR' WHERE name = 'Toronto Expos';
UPDATE historical_teams SET abbreviation = 'COL' WHERE name = 'Colorado Blizzards';
UPDATE historical_teams SET abbreviation = 'MIA' WHERE name = 'Miami Sunset';

-- And the live clubs. `teams.abbreviation` is unique across the whole table,
-- and none of these six is taken by another club, so each is a plain update
-- rather than a shuffle.
UPDATE teams SET abbreviation = 'HAR' WHERE name = 'Harlem Jazz';
UPDATE teams SET abbreviation = 'HER' WHERE name = 'Hershey Otters';
UPDATE teams SET abbreviation = 'PHI' WHERE name = 'Philadelphia Panthers';
UPDATE teams SET abbreviation = 'TOR' WHERE name = 'Toronto Expos';
UPDATE teams SET abbreviation = 'COL' WHERE name = 'Colorado Blizzards';
UPDATE teams SET abbreviation = 'MIA' WHERE name = 'Miami Sunset';
