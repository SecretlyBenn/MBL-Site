-- TurboMCG and TerminalTurbo are one player, confirmed by the league.
--
-- As in 0039 and 0048 the two names never share a season, so nothing is
-- double-counted and every row simply takes the kept name:
--
--   TurboMCG       MCBA X pre-season                      Emeralds
--   TerminalTurbo  MCBA XI through MCBA XIV               Vipers, Samurai,
--                                                         Beavers, Crocodiles,
--                                                         Sentinels
--
-- TerminalTurbo is kept: it is the later name and the one already linked to
-- the account, which answers to P_arz today. Neither name is in the live
-- player pool.

UPDATE historical_player_stats SET player_name = 'TerminalTurbo' WHERE player_name = 'TurboMCG';
UPDATE historical_game_stats SET player_name = 'TerminalTurbo' WHERE player_name = 'TurboMCG';
UPDATE historical_roster_entries SET player_name = 'TerminalTurbo' WHERE player_name = 'TurboMCG';

-- TurboMCG never had an account linked; TerminalTurbo does.
DELETE FROM minecraft_profiles WHERE player_name = 'TurboMCG';
