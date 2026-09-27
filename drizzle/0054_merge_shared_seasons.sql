-- Four more split records, the ones 0053 could not simply rename.
--
-- Each of these pairs holds a line for the *same* club-season, so renaming
-- would leave one player with two lines for one club - which no player in the
-- archive has. They are two stints of a season the player renamed partway
-- through, not a stale duplicate: none of the four pairs appears in the same
-- game as itself. So the lines are added together, as sppydaa's were in 0051.
--
-- Rates follow the archive's own convention, checked against neighbouring
-- rows: AVG = H / AB, OBP = (H + BB) / PA, SLG = TB / AB, OPS = OBP + SLG,
-- fielding = PO / (PO + E), all to three places.

-- --------------------------------- Monkeys, MCBA X: 123yeetmymom -> Gamer_wy
--   Gamer_wy      3 G, 4 AB, 0 H, 1 RBI, 2 BB, 2 K,  6 PA, 1 LOB, 1 PO
--   123yeetmymom  2 G, 4 AB, 1 H,        0 BB, 2 K,  4 PA
--   together      5 G, 8 AB, 1 H, 1 RBI, 2 BB, 4 K, 10 PA, 1 LOB, 1 PO
--   AVG .125   OBP 3/10 = .300   SLG 1/8 = .125   OPS .425
UPDATE historical_player_stats SET
  games = 5, at_bats = 8, hits = 1, strikeouts = 4, plate_appearances = 10,
  total_bases = 1, singles = 1,
  batting_average = 0.125, on_base_pct = 0.3, slugging_pct = 0.125, ops = 0.425
WHERE player_name = 'Gamer_wy' AND historical_team_id = 287;

DELETE FROM historical_player_stats WHERE player_name = '123yeetmymom' AND historical_team_id = 287;
UPDATE historical_player_stats SET player_name = 'Gamer_wy' WHERE player_name = '123yeetmymom';
UPDATE historical_game_stats SET player_name = 'Gamer_wy' WHERE player_name = '123yeetmymom';
UPDATE historical_roster_entries SET player_name = 'Gamer_wy' WHERE player_name = '123yeetmymom';

-- ------------------ Bandits, MCBA XII pre-season: barack_obomba20 -> zoomies100
--   zoomies100       6 G, 13 AB, 2 R, 3 H, 5 K, 13 PA, 3 PO, 3 E
--   barack_obomba20  2 G,  4 AB,      0 H, 2 K,  4 PA, 1 PO
--   together         8 G, 17 AB, 2 R, 3 H, 7 K, 17 PA, 4 PO, 3 E
--   AVG 3/17 = .176   OBP 3/17 = .176   SLG 3/17 = .176   OPS .352   FLD 4/7 = .571
UPDATE historical_player_stats SET
  games = 8, at_bats = 17, strikeouts = 7, plate_appearances = 17,
  putouts = 4,
  batting_average = 0.176, on_base_pct = 0.176, slugging_pct = 0.176, ops = 0.352,
  fielding_pct = 0.571
WHERE player_name = 'zoomies100' AND historical_team_id = 325;

DELETE FROM historical_player_stats WHERE player_name = 'barack_obomba20' AND historical_team_id = 325;
UPDATE historical_player_stats SET player_name = 'zoomies100' WHERE player_name = 'barack_obomba20';
UPDATE historical_game_stats SET player_name = 'zoomies100' WHERE player_name = 'barack_obomba20';
UPDATE historical_roster_entries SET player_name = 'zoomies100' WHERE player_name = 'barack_obomba20';

-- ------------- Crocodiles, MCBA XII pre-season: epicmegablade8 -> Biscuitok
--   Biscuitok       1 G, 3 AB, 1 R, 3 K, 3 PA, 1 LOB, 1 PO
--   epicmegablade8  1 G, 1 AB,      1 K, 1 PA
--   together        2 G, 4 AB, 1 R, 4 K, 4 PA, 1 LOB, 1 PO
--   Neither reached base, so every rate stays where it is.
UPDATE historical_player_stats SET
  games = 2, at_bats = 4, strikeouts = 4, plate_appearances = 4
WHERE player_name = 'Biscuitok' AND historical_team_id = 327;

DELETE FROM historical_player_stats WHERE player_name = 'epicmegablade8' AND historical_team_id = 327;
UPDATE historical_player_stats SET player_name = 'Biscuitok' WHERE player_name = 'epicmegablade8';
UPDATE historical_game_stats SET player_name = 'Biscuitok' WHERE player_name = 'epicmegablade8';
UPDATE historical_roster_entries SET player_name = 'Biscuitok' WHERE player_name = 'epicmegablade8';

-- ------------------- Bandits, MCBA XIII: Landihlicious -> Landon_Senpai
--   Landon_Senpai  1 G, 3 AB, 1 K, 3 PA,        1 E
--   Landihlicious  1 G, 3 AB, 3 K, 3 PA, 1 LOB, 1 E
--   together       2 G, 6 AB, 4 K, 6 PA, 1 LOB, 2 E
--   Neither reached base, so every rate stays where it is.
UPDATE historical_player_stats SET
  games = 2, at_bats = 6, strikeouts = 4, plate_appearances = 6,
  left_on_base = 1, errors = 2
WHERE player_name = 'Landon_Senpai' AND historical_team_id = 380;

DELETE FROM historical_player_stats WHERE player_name = 'Landihlicious' AND historical_team_id = 380;
UPDATE historical_player_stats SET player_name = 'Landon_Senpai' WHERE player_name = 'Landihlicious';
UPDATE historical_game_stats SET player_name = 'Landon_Senpai' WHERE player_name = 'Landihlicious';
UPDATE historical_roster_entries SET player_name = 'Landon_Senpai' WHERE player_name = 'Landihlicious';

-- Each pair was on one club's roster under both names. Only the earliest row
-- for each club survives.
DELETE FROM historical_roster_entries WHERE player_name = 'Gamer_wy' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Gamer_wy' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'zoomies100' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'zoomies100' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Biscuitok' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Biscuitok' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Landon_Senpai' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Landon_Senpai' GROUP BY historical_team_id);

-- The merged-away names keep no profile; the kept name already points at the
-- account.
DELETE FROM minecraft_profiles WHERE player_name IN ('123yeetmymom', 'barack_obomba20', 'epicmegablade8', 'Landihlicious');
