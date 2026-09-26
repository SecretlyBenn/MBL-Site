-- Cronixify is the player the Collegiate Association later knew as Purpeyy,
-- confirmed by the league, which named the account _purp__.
--
-- That account holds three names across the site: Cronixify and Purpeyy in the
-- Collegiate Association, and _purp__ in the MBL. Only the two Collegiate
-- Association names are merged here. The MBL's _purp__ - Season XII with the
-- Blizzards and the Voodoo - is left alone, because the league keeps its MCBA
-- and MBL records apart; all three names already draw the same head.
--
-- The two merged names share no season, so as in 0039 every row simply takes
-- the kept name:
--
--   Cronixify  MCBA IX                          Oranges
--   Purpeyy    MCBA X through MCBA XII          Vipers, Monkeys
--
-- Purpeyy is kept: it is the later name and the one already linked.

UPDATE historical_player_stats SET player_name = 'Purpeyy' WHERE player_name = 'Cronixify';
UPDATE historical_game_stats SET player_name = 'Purpeyy' WHERE player_name = 'Cronixify';
UPDATE historical_roster_entries SET player_name = 'Purpeyy' WHERE player_name = 'Cronixify';

-- Cronixify never had an account linked; Purpeyy does.
DELETE FROM minecraft_profiles WHERE player_name = 'Cronixify';
