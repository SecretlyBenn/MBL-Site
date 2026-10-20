-- A third competition: the off-season tournament.
--
-- Everything that makes a competition work on this site already reads the
-- `leagues` table - the tabs at the top, /off-season/standings and the rest
-- of the pages under it, which league a club is created in, which clubs may
-- be scheduled against each other, and which career a season's statistics
-- count towards. So most of this is one row.
--
-- `is_tournament` is the part that is new. A tournament borrows players
-- rather than signing them:
--
--   * Its pool is everybody on the site, not the free agents of one
--     competition. The whole point is that MBL and MCBA players play in it.
--   * A player picked up by one of its clubs keeps the club they belong to.
--     Signing them the ordinary way would set `players.team_id` and take them
--     off their MBL roster, which is not what a December tournament means.
--     They hold a `roster_spots` row instead - the same mechanism the MiBL
--     already uses for a sent-down player, for the same reason.
--   * So nothing a tournament does touches `players.team_id`, `status` or
--     `league_id`, and when it is over the rosters it built are deleted
--     without having disturbed anything.
--
-- Six innings is a guess and the only one here: the MBL plays six and the
-- MCBA five, and nobody has said what this plays. It is the divisor in every
-- earned run average in the tournament, so it is worth setting before the
-- first game rather than after - one UPDATE on this row.
--
-- The ALTER fails with "duplicate column name" if this file is run twice.
-- That is the harmless half; the INSERT below is guarded and is the half that
-- would do damage, so the two are written to be run separately if a retry is
-- needed.

ALTER TABLE leagues ADD COLUMN is_tournament INTEGER NOT NULL DEFAULT 0;

INSERT INTO leagues (slug, name, abbreviation, sort_order, has_minor_league, innings_per_game, bench_limit, is_tournament)
SELECT 'off-season', 'Off-season', 'OFF', 2, 0, 6, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM leagues WHERE slug = 'off-season');
