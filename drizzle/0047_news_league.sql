-- An article belongs to the league it is about. Without this the MCBA's front
-- page carried the MBL's headlines, which is the one thing a reader switching
-- between the two would notice first.
--
-- Every article written so far is the MBL's. New ones are stamped by the
-- newsroom, because SQLite cannot default a column to the result of a query.
ALTER TABLE news_articles ADD COLUMN league_id integer REFERENCES leagues (id);
UPDATE news_articles
  SET league_id = (SELECT id FROM leagues WHERE slug = 'mbl')
  WHERE league_id IS NULL;
