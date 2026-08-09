-- Identity moves from ChatGPT (email) to Discord (account id). The table is
-- empty, so it is rebuilt rather than migrated: SQLite cannot drop a UNIQUE
-- column in place, and there is nothing to preserve.
DROP TABLE IF EXISTS `users`;
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discord_id` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`team_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_unique` ON `users` (`discord_id`);
