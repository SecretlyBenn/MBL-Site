CREATE TABLE `historical_player_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`historical_team_id` integer NOT NULL,
	`player_name` text NOT NULL,
	`games` integer,
	`at_bats` integer,
	`runs` integer,
	`hits` integer,
	`doubles` integer,
	`triples` integer,
	`home_runs` integer,
	`rbis` integer,
	`walks` integer,
	`strikeouts` integer,
	`stolen_bases` integer,
	`batting_average` real,
	`on_base_pct` real,
	`slugging_pct` real,
	`ops` real,
	`total_bases` integer,
	`pitching_games` integer,
	`games_started` integer,
	`wins` integer,
	`losses` integer,
	`saves` integer,
	`innings_pitched` real,
	`hits_allowed` integer,
	`runs_allowed` integer,
	`earned_runs` integer,
	`home_runs_allowed` integer,
	`strikeouts_pitched` integer,
	`walks_allowed` integer,
	`era` real,
	`whip` real,
	FOREIGN KEY (`season_id`) REFERENCES `historical_seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`historical_team_id`) REFERENCES `historical_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `historical_seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source_season_id` text NOT NULL,
	`is_playoffs` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `historical_seasons_name_unique` ON `historical_seasons` (`name`);--> statement-breakpoint
CREATE TABLE `historical_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`name` text NOT NULL,
	`source_team_id` text NOT NULL,
	`wins` integer,
	`losses` integer,
	`ties` integer,
	FOREIGN KEY (`season_id`) REFERENCES `historical_seasons`(`id`) ON UPDATE no action ON DELETE no action
);
