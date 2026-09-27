-- The two pairs 0053 refused to merge. The league confirmed both from Discord:
-- deanog_ is addressed as YeezysBack, and CardsFan1982's sign-up post gives
-- their IGN as Baseballboy1344.
--
-- 0053 held them back because each pair appears in one game together, which a
-- single player cannot do. That reasoning was sound but the conclusion was
-- wrong: the league knows who these people are, and the archive is what is
-- mistaken. Both box scores reconcile exactly against the final score - game
-- 3971 has 8 away batters scoring 2 in a 2-0 game, game 4752 has 9 away
-- batters scoring 8 in an 8-0 game - so neither duplicate line is a stray row
-- that can simply be dropped. Removing one would leave the box score not
-- adding up to its own result, which is worse than the duplicate.
--
-- So the names merge and the game rows are only renamed. Nothing is added or
-- taken away at game level, and the two box scores keep listing this player
-- twice, as the source recorded them. Left as a known wrinkle rather than
-- quietly patched, because guessing which line is the real one would be
-- inventing data.

-- ------------------------------------------------ YeezysBack -> deanog_ (MBL)
--
-- In Season VI the two names are on different clubs - Miami Boom and St.
-- Augustine Embers - so this is a mid-season move, not two lines for one club,
-- and every row simply takes the kept name. deanog_ is kept: it runs to Season
-- XII, past YeezysBack's Season XI, and is what the account answers to today.

UPDATE historical_player_stats SET player_name = 'deanog_' WHERE player_name = 'YeezysBack';
UPDATE historical_game_stats SET player_name = 'deanog_' WHERE player_name = 'YeezysBack';
UPDATE historical_roster_entries SET player_name = 'deanog_' WHERE player_name = 'YeezysBack';

-- ------------------------------------ Baseballboy1344 -> Cardsfan1982 (MCBA)
--
-- Both names hold a line for the Spiders in MCBA XIV, so those two are added
-- together the way 0054's were. Cardsfan1982 is kept as the later name.
--
--   Cardsfan1982     5 G, 13 AB, 4 R, 7 H, 3 2B, 1 3B, 3 RBI, 0 BB, 2 K, 1 SB, 13 PA, 2 LOB, 2 PO, 1 E
--   Baseballboy1344  4 G,  9 AB, 2 R, 2 H,               1 BB, 5 K,       10 PA, 3 LOB, 2 PO
--   together         9 G, 22 AB, 6 R, 9 H, 3 2B, 1 3B, 3 RBI, 1 BB, 7 K, 1 SB, 23 PA, 5 LOB, 4 PO, 1 E
--
--   singles 5 + 3 doubles + 1 triple = 9 hits; total bases 5 + 6 + 3 = 14
--   AVG 9/22 = .409   OBP 10/23 = .435   SLG 14/22 = .636   OPS 1.071
--   fielding 4 / (4 + 1) = .800

UPDATE historical_player_stats SET
  games = 9, at_bats = 22, runs = 6, hits = 9, rbis = 3, walks = 1, strikeouts = 7,
  total_bases = 14, singles = 5, plate_appearances = 23, left_on_base = 5,
  putouts = 4, errors = 1,
  batting_average = 0.409, on_base_pct = 0.435, slugging_pct = 0.636, ops = 1.071,
  fielding_pct = 0.8
WHERE player_name = 'Cardsfan1982' AND historical_team_id = 388;

DELETE FROM historical_player_stats WHERE player_name = 'Baseballboy1344' AND historical_team_id = 388;
UPDATE historical_player_stats SET player_name = 'Cardsfan1982' WHERE player_name = 'Baseballboy1344';
UPDATE historical_game_stats SET player_name = 'Cardsfan1982' WHERE player_name = 'Baseballboy1344';
UPDATE historical_roster_entries SET player_name = 'Cardsfan1982' WHERE player_name = 'Baseballboy1344';

-- Where both names sat on one club's roster, only the earliest row survives.
DELETE FROM historical_roster_entries WHERE player_name = 'deanog_' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'deanog_' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Cardsfan1982' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Cardsfan1982' GROUP BY historical_team_id);

-- 0053 removed the links on the merged-away names. The kept names carry the
-- accounts already, so there is nothing to restore.
