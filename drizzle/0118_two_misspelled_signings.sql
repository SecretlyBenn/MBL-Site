-- Two players who exist twice because a signing was typed wrong.
--
-- `Chrislomien` was signed to the Samurai at 08:08 on the 28th and released at
-- 08:22; `HeroHamSandwich` was signed to the Hitmen at 11:09 and released at
-- 16:55. Both are misspellings - the real men are `chrislomein` (308, Samurai)
-- and `Hero_HamSandwich` (332, Hitmen), both signed correctly afterwards, both
-- with their careers and their accounts intact. The misspelt rows are what the
-- bot creates when its spelling finds nobody here: the lookup misses, the
-- action is a signing, and a signing of somebody this site has never seen is a
-- new player by definition.
--
-- Nothing is lost by deleting them. Neither has an archive line, an account, a
-- club or a single row in any scorecard - checked before writing this - so
-- there is no record here to move onto the real man. Their roster moves go
-- with them rather than onto him: they are a signing that was undone within
-- the hour because the name was wrong, and reading them onto his history would
-- say he was released and re-signed, which never happened to him.
--
-- The moves go first, because they are what refers to the rows.
DELETE FROM roster_moves WHERE player_id IN (1193, 1201);

-- Named as well as numbered, so that if these ids ever mean anything else the
-- statement matches nothing instead of deleting the wrong player.
DELETE FROM players WHERE id = 1193 AND display_name = 'Chrislomien';
DELETE FROM players WHERE id = 1201 AND display_name = 'HeroHamSandwich';
