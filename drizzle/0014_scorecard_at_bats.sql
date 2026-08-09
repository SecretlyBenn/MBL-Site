CREATE TABLE `scorecard_lineups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scorecard_id` integer NOT NULL,
	`is_home` integer NOT NULL,
	`player_id` integer NOT NULL,
	`batting_order` integer,
	`position` text NOT NULL,
	`dh_for_player_id` integer,
	`is_starter` integer DEFAULT true NOT NULL,
	`pitching_order` integer,
	FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dh_for_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plate_appearances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scorecard_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`inning` integer NOT NULL,
	`is_home_batting` integer NOT NULL,
	`batter_player_id` integer NOT NULL,
	`pitcher_player_id` integer NOT NULL,
	`result` text NOT NULL,
	`fielders` text,
	`rbis` integer DEFAULT 0 NOT NULL,
	`batter_scored` integer DEFAULT false NOT NULL,
	`other_runs_scored` integer DEFAULT 0 NOT NULL,
	`unearned_runs` integer DEFAULT 0 NOT NULL,
	`outs_recorded` integer DEFAULT 0 NOT NULL,
	`error_position` integer,
	`error_player_id` integer,
	`stolen_bases` integer DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batter_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pitcher_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`error_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scorecard_lineups_scorecard_idx` ON `scorecard_lineups` (`scorecard_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `plate_appearances_sequence_unique` ON `plate_appearances` (`scorecard_id`,`sequence`);
