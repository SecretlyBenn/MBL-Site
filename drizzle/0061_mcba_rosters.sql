-- The Collegiate Association's live rosters, from MCBA XIV.
--
-- 175 names are on an MCBA XIV roster. 161 of them get a live player here; the
-- other 14 already have one, and are left exactly as they are.
--
-- Those 14 are the reason this is not a straight copy. Every one of them is on
-- the Coyotes (MIBL) - the affiliate - and every one is currently ACTIVE on an
-- MBL club. They are not college players who also play in the MBL; they are
-- MBL players who were sent down, which is what the MiBL is for. A player has
-- one club, so putting them on the Coyotes would take them off the MBL roster
-- they are actually on. Being sent down is a status on their own club
-- (TRIPLE_A, with a SEND_DOWN move), not a second club, and whether any of
-- them is down *today* is not something MCBA XIV can say - it only says they
-- were on that roster during it.
--
-- So the rule is: a live player for every MCBA XIV roster name the pool does
-- not already know. Nobody is moved, and nobody's status is changed.
--
-- Nobody appears on two college clubs in XIV, so each name has one club. The
-- 8 college clubs contribute 145 and the Coyotes 16.

INSERT OR IGNORE INTO players (minecraft_username, display_name, team_id, status)
SELECT DISTINCT r.player_name, r.player_name, live.id, 'ACTIVE'
FROM historical_roster_entries r
JOIN historical_teams t ON t.id = r.historical_team_id
JOIN historical_seasons s ON s.id = t.season_id
JOIN teams live
  ON live.name = t.name
 AND live.league_id = (SELECT id FROM leagues WHERE slug = 'mcba')
WHERE s.name = 'MCBA XIV'
  AND NOT EXISTS (SELECT 1 FROM players p WHERE p.minecraft_username = r.player_name);
