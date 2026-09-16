-- dagoat695 (Louisiana Voodoo, Season XII) plays as CookieTheDavid now, as the
-- league confirmed. Nobody had ever used the name dagoat695 that Mojang or the
-- name histories could find, so this one came from someone who knows him.
INSERT INTO minecraft_profiles (player_name, uuid, current_name, source)
VALUES ('dagoat695', '1cd3d8c710144265924eb238761fc90e', 'CookieTheDavid', 'user')
ON CONFLICT (player_name) DO UPDATE SET
  uuid = excluded.uuid, current_name = excluded.current_name, source = excluded.source;
