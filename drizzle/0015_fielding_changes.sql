CREATE TABLE `fielding_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scorecard_id` integer NOT NULL,
	`is_home` integer NOT NULL,
	`inning` integer NOT NULL,
	`applied_at_sequence` integer NOT NULL,
	`player_id` integer NOT NULL,
	`position` text NOT NULL,
	FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fielding_changes_scorecard_idx` ON `fielding_changes` (`scorecard_id`,`is_home`,`applied_at_sequence`);
