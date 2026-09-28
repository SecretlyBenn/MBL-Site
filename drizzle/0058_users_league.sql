-- Which competition an account's role applies to.
--
-- A GM needs nothing here: they manage one club, and the club carries the
-- league. An umpire has no club, so without this every umpire sees every open
-- scorecard in both competitions.
--
-- Left null on purpose, and null means both. The league expects the same
-- people to officiate both competitions most of the time, so "both" is the
-- default and naming a league is how you narrow someone to one. That also
-- makes this migration a no-op for the accounts that already exist.

ALTER TABLE users ADD COLUMN league_id integer REFERENCES leagues (id);
