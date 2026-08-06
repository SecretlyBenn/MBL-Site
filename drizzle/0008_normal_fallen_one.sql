CREATE TABLE `historical_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`played_on` text,
	`start_time` text,
	`away_team_id` integer,
	`home_team_id` integer,
	`away_score` integer,
	`home_score` integer,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `historical_seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `historical_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_team_id`) REFERENCES `historical_teams`(`id`) ON UPDATE no action ON DELETE no action
);
