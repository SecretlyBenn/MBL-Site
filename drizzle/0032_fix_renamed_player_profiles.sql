-- Two profiles pointed at the wrong Minecraft account.
--
-- A rename keeps the account's UUID and frees the old name for anyone else to
-- take. Resolving an archived name against Mojang years later therefore finds
-- whoever holds that name now, not the player who used to. Both of these were
-- resolved that way and landed on strangers:
--
--   Aarontheyou -> held 41adaf9b... which is now the account "Antzxyez";
--                  the player is J1yx, 0827fe1e...
--   _Junex_     -> held f525161a... which is an account still named "_Junex_";
--                  the player is Willthetruck, eda76d9f...
--
-- Both replacements were confirmed against Mojang by looking the CURRENT name
-- up and taking the id it returned. Marked "user" rather than "mojang" because
-- a person supplied the link between the old and new name - nothing in the
-- data records that a rename happened.
UPDATE minecraft_profiles
SET uuid = '0827fe1ed30c46eb883b85e29cd06417',
    current_name = 'J1yx',
    source = 'user'
WHERE player_name = 'Aarontheyou';

UPDATE minecraft_profiles
SET uuid = 'eda76d9f00e14a959f939c00a23380d5',
    current_name = 'Willthetruck',
    source = 'user'
WHERE player_name = '_Junex_';

-- _purp__'s id is correct - Mojang confirms 96dc8f4c... is "_Purp__" - but its
-- current_name said "Perfextion_", a name that resolves to nothing today.
UPDATE minecraft_profiles
SET current_name = '_Purp__'
WHERE player_name = '_purp__';
