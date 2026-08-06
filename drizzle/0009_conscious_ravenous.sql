CREATE TABLE `historical_game_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`is_home` integer NOT NULL,
	`kind` text NOT NULL,
	`player_name` text NOT NULL,
	`at_bats` integer,
	`runs` integer,
	`hits` integer,
	`doubles` integer,
	`triples` integer,
	`home_runs` integer,
	`rbis` integer,
	`walks` integer,
	`strikeouts` integer,
	`innings_pitched` real,
	`earned_runs` integer,
	`hits_allowed` integer,
	`runs_allowed` integer,
	`strikeouts_pitched` integer,
	`walks_allowed` integer,
	FOREIGN KEY (`game_id`) REFERENCES `historical_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `historical_line_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`is_home` integer NOT NULL,
	`team_label` text NOT NULL,
	`innings` text,
	`runs` integer,
	`hits` integer,
	`errors` integer,
	FOREIGN KEY (`game_id`) REFERENCES `historical_games`(`id`) ON UPDATE no action ON DELETE no action
);
