-- SwaggyBuff played Season IX and its playoffs (Nov 2023 - Mar 2024). The only
-- account ever recorded under that name held it Oct 2023 - Jan 2024 and is
-- gayln today (Mojang confirmed, 2026-09-14). 0038 skipped it after reading
-- the seasons as 2022.
INSERT INTO minecraft_profiles (player_name, uuid, current_name, source)
VALUES ('SwaggyBuff', '23575dbe66da4fed91413429a1c58305', 'gayln', 'history')
ON CONFLICT (player_name) DO NOTHING;
