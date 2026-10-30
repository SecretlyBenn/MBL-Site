-- Accounts for the players the roster bot signed without one.
--
-- When the bot pushes a signing for somebody this site has never seen, the
-- route creates a `players` row for him. It was already asking Mojang who
-- holds that name - it has to, so that a rename is followed rather than
-- opening a second row beside an existing career - and then threw the answer
-- away. So every genuinely new man arrived with no account on file, which
-- draws the neutral block instead of his head on his own page and in every
-- roster and lineup he appears in. Nobody reports that, because he looks fine
-- apart from a grey square.
--
-- The route now writes the profile at the same time it creates the player.
-- This is the nine already signed, seven of whom Mojang could resolve.
--
-- Every uuid here was checked against `minecraft_profiles` first: none of them
-- already belongs to another name on this site. That check is the whole
-- safeguard - linking a name onto an account somebody else holds is a merge,
-- and merges are decided by a person, not by a migration.
--
-- `source` is 'mojang' because that is where the answer came from, by way of
-- playerdb.co, which relays Mojang for requests the real one refuses.
--
-- INSERT OR IGNORE, so running this twice is the same as running it once and
-- a name linked by hand in the meantime is left exactly as it is.
INSERT OR IGNORE INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('Jakedaboy',      'dab5896af27d4d01adb460b1f490f73c', 'jakedaboy',      'mojang'),
  ('Z3k3_',          'eb8478af4de749a9bdee2ad4f56afd20', 'Z3K3_',          'mojang'),
  ('Jmanzplan',      '5757cf60993a4f01bd10cbeb8cbfe429', 'Jmanzplan',      'mojang'),
  ('Jaxx1446',       'b0dfdf511727423bb3223d1712caa77b', 'Jaxx1446',       'mojang'),
  ('CycloneTheFoxx', '9404c8e7d6f8408e975d187ce0511c89', 'CycloneTheFoxx', 'mojang'),
  ('ubesnotcuh',     'f3f85735ec86411c8cd91e5de78be699', 'ubesnotcuh',     'mojang'),
  ('Kykybubba4',     'b19b418fcfe947ed87cd10aad898a274', 'Kykybubba4',     'mojang');

-- Deliberately not here: Chrislomien (Samurai) and Virments (Louisiana
-- Voodoo). Neither name exists on Mojang at all, so there is nothing to link
-- and guessing at a near-miss would put a stranger's face on a player. They
-- are almost certainly a Discord nickname that does not match the in-game
-- name, or a typo in the signing - either way it is a question for the league,
-- and a blank head is the right answer until somebody asks it.
