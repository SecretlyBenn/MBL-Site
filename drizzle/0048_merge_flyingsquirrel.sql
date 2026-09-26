-- Two identity corrections the league confirmed while linking Minecraft heads.
--
-- 1. Piper_Driver769 and AFlyingSquirrel17 are one player.
--
-- Like 0039 and unlike 0036, the two names never share a season, so nothing is
-- double-counted and every row simply takes the kept name:
--
--   Piper_Driver769    MCBA X pre-season, MCBA X, MCBA X playoffs   Vipers
--   AFlyingSquirrel17  MCBA XI, XII pre-season, XII, XII playoffs,
--                      MCBA XIII                                    Vipers, Monkeys
--
-- AFlyingSquirrel17 is kept because it is the later name and the one already
-- linked to the account, which answers to AFlyingSquirrel7 today. Neither name
-- is in the live player pool, so there is nothing to merge there.

UPDATE historical_player_stats SET player_name = 'AFlyingSquirrel17' WHERE player_name = 'Piper_Driver769';
UPDATE historical_game_stats SET player_name = 'AFlyingSquirrel17' WHERE player_name = 'Piper_Driver769';
UPDATE historical_roster_entries SET player_name = 'AFlyingSquirrel17' WHERE player_name = 'Piper_Driver769';

-- Piper_Driver769 never had an account linked; AFlyingSquirrel17 does.
DELETE FROM minecraft_profiles WHERE player_name = 'Piper_Driver769';

-- 2. Spector (Juju) is the player the site already carries as Z1_juju, whose
-- account is lilbabygirl20 (see 0039). The name cannot be looked up on its own
-- - a bracketed nickname is not a Minecraft username - so it takes the same
-- account id rather than a fresh lookup.
--
-- Only the head is pointed at the account here. Whether the two names are one
-- player's split history, and so should be merged the way Piper_Driver769 was
-- above, is a separate question for the league.

INSERT OR REPLACE INTO minecraft_profiles (player_name, uuid, current_name, source)
SELECT 'Spector (Juju)', uuid, current_name, 'user'
FROM minecraft_profiles WHERE player_name = 'Z1_juju';
