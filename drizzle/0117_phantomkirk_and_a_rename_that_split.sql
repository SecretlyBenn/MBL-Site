-- The last two players on a club with no head, and they are two different
-- faults that look identical on a roster page.
--
-- `PhantomKirk` (Hitmen) is the simple one: the account exists, nobody had
-- filed it. `70ee9c63...` belongs to no other name here, so this is an insert
-- and nothing more.
INSERT OR IGNORE INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('PhantomKirk', '70ee9c638ab84e6086c5db398a2494b0', 'PhantomKirk', 'mojang');

-- `FemBoy_T` (Sentinels) is a rename that split a man in two. Mojang says
-- `e56ac38e...` is called FemBoy_T today, and this site already had that
-- account on file under `Romans_8_14` - seven season lines, forty-four game
-- lines, five roster entries and a free-agent row with no club. He was signed
-- under the new name, which created a second player beside the first, and the
-- career stayed on the old one.
--
-- The site cannot repair this by itself, which is the part worth understanding.
-- `/api/head/[uuid]` would notice the rename and hand it to `adoptCurrentName`,
-- and `adoptCurrentName` refuses to move a name onto a name that already
-- exists, because that is a merge and nothing would record which rows came
-- from where. Refusing is right. It just means a person has to do it, here.
--
-- A rename rather than an add-the-lines merge: FemBoy_T has no archive line of
-- any kind, so there is no club-season to collide and nothing to add together.
-- The usual check that the two names never share a game is vacant for the same
-- reason - he has no games under the new name to share - but the account is the
-- evidence here, and one account is one person.
UPDATE historical_player_stats   SET player_name = 'FemBoy_T' WHERE player_name = 'Romans_8_14';
UPDATE historical_game_stats     SET player_name = 'FemBoy_T' WHERE player_name = 'Romans_8_14';
UPDATE historical_roster_entries SET player_name = 'FemBoy_T' WHERE player_name = 'Romans_8_14';

-- The account moves to the name he goes by now, and `current_name` with it, so
-- the head route has nothing left to adopt. The delete first is for the case
-- where the bot pushes another move for him between runs of this file: the
-- route now files an account when it creates a player, and that row would make
-- the update below collide with the primary key.
DELETE FROM minecraft_profiles
WHERE player_name = 'Romans_8_14' AND EXISTS (SELECT 1 FROM minecraft_profiles WHERE player_name = 'FemBoy_T');
UPDATE minecraft_profiles SET player_name = 'FemBoy_T', current_name = 'FemBoy_T'
WHERE player_name = 'Romans_8_14';

-- His own history, so it moves with him rather than being dropped with the row
-- it hangs off - and it is the only thing referring to that row, which is what
-- makes the delete safe. Both are guarded because the old account still holds
-- a copy of this database that stopped receiving live rosters when the site
-- moved: it has no row for a player signed last week, and without the guard
-- the missing row fails the foreign key and rolls back the archive rename with
-- it. See `drizzle/0115`, which learned this the hard way.
UPDATE roster_moves SET player_id = 1203
WHERE player_id = 285 AND EXISTS (SELECT 1 FROM players WHERE id = 1203);
DELETE FROM players
WHERE id = 285 AND display_name = 'Romans_8_14'
  AND NOT EXISTS (SELECT 1 FROM roster_moves WHERE player_id = 285);
