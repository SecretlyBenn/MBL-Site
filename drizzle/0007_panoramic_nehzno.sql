CREATE TABLE `historical_roster_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`historical_team_id` integer NOT NULL,
	`player_name` text NOT NULL,
	`jersey_number` text,
	`positions` text,
	FOREIGN KEY (`season_id`) REFERENCES `historical_seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`historical_team_id`) REFERENCES `historical_teams`(`id`) ON UPDATE no action ON DELETE no action
);
