-- Who opened a scorecard and who sent it up are two different people.
--
-- submitted_by_user_id was written once, when the game was claimed, and never
-- again - so a card always carried the name of whoever pressed Start, even
-- when they had to drop out and somebody else scored the whole game and sent
-- it to review. The head umpire's list said "Submitted by" and named the wrong
-- person.
--
-- Nothing ever stopped a second umpire taking over: any umpire in the
-- competition can open any game being scored, and always could. It was only
-- the record that was wrong.
--
-- started_by_user_id now keeps the claim and submitted_by_user_id becomes
-- whoever finished. Existing rows are backfilled from the only name they have,
-- which is right for every card where one person did both - and there is no
-- way to recover a second name for any where they did not.
ALTER TABLE scorecards ADD COLUMN started_by_user_id INTEGER REFERENCES users(id);

UPDATE scorecards SET started_by_user_id = submitted_by_user_id WHERE started_by_user_id IS NULL;
