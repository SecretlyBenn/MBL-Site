-- Clear last season's MiBL, which nothing else was ever going to clear.
--
-- The MiBL is a status rather than a second club: a man sent down keeps his
-- own club, goes TRIPLE_A, and holds a `roster_spots` row on the MiBL side.
-- Both halves of that were still sitting here from MCBA XIV, because the
-- only thing that writes them is an admin on this site and the only thing
-- that would clear them is the same admin. The roster bot runs these leagues
-- now, and `/sitecheck` compares which club a man is on and nothing else, so
-- it reads a sent-down player as correctly placed and leaves the flag alone
-- forever.
--
-- What that looked like: the Hershey Otters have twelve men in the bot and
-- showed four here, because eight of them were carrying a year-old TRIPLE_A
-- and the rosters page lists a club's active players. Seven of those eight
-- were sent down to nowhere - flagged, but holding no MiBL spot - so they
-- appeared on no page at all. The Coyotes showed eighteen for the opposite
-- reason: fourteen spots from last season, plus four men this site still had
-- on that club.
--
-- Both are last season's. The MiBL has nobody in it today, so:
DELETE FROM roster_spots WHERE team_id IN (SELECT id FROM teams WHERE name = 'Coyotes');

-- `team_id IS NOT NULL` so this can only ever free a man who has a club to
-- be active on. A free agent carrying this status would be a different bug.
UPDATE players SET status = 'ACTIVE' WHERE status = 'TRIPLE_A' AND team_id IS NOT NULL;

-- When the bot's /down and /up start pushing, they will write both of these
-- again and this stops being something a person has to remember.
