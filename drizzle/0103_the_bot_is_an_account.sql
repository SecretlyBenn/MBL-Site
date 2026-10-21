-- The roster bot, as an account, so its moves can be recorded like anyone's.
--
-- `roster_moves.acting_user_id` is NOT NULL and points at `users`, because
-- every move on this site was made by a person. A move pushed from Discord
-- was not, and the alternative to giving the bot a row was making that column
-- nullable - which in SQLite means rebuilding the table, and which would lose
-- the guarantee that every other move has somebody's name on it.
--
-- The id is the bot's own Discord application id, so it can never collide
-- with a real person's account. It is deliberately given no row in
-- `user_roles`: an account with no roles holds nothing at all, so even if
-- somebody signed in as the bot they would reach nothing. This row exists to
-- be pointed at by an audit trail, not to be used.

INSERT INTO users (discord_id, display_name)
SELECT '982120249006628866', 'MBL Bot'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE discord_id = '982120249006628866');
