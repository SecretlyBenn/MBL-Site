-- Thirty-seven box score lines in MBL Seasons IX and X carry a jersey number
-- as part of the player's name: `Flburn32 #2`, `ChosenUno_ #7`.
--
-- A Minecraft username cannot contain a space or a hash, so these were never
-- names. The import that read those two seasons took the number printed beside
-- the name and kept it, and because the archive is keyed by name the line then
-- belonged to nobody: no head, no season total, and no connection to the man
-- who actually batted. Several players appear twice over with two numbers -
-- `Soto22 #1` and `Soto22 #3`, `Perno_ #1` and `Perno_ #9` - which is one man
-- changing his shirt between seasons, not two players.
--
-- Twenty-one of the thirty base names already have an account linked, so most
-- of these get their head back the moment the number comes off.
--
-- Only historical_game_stats is affected: no season line or roster entry was
-- ever written this way. The number itself is not kept - historical_game_stats
-- has nowhere to put it, and historical_roster_entries.jersey_number already
-- records shirt numbers for the seasons that have them.
--
-- Checked first: no game has both the bare name and the numbered one for the
-- same kind of line, so nothing is merged by stripping it.

UPDATE historical_game_stats
SET player_name = rtrim(substr(player_name, 1, instr(player_name, ' #') - 1))
WHERE player_name LIKE '% #%';
