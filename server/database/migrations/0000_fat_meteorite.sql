CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `admin_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `electorates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `politicians` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`party` text NOT NULL,
	`chamber` text NOT NULL,
	`electorate_id` integer,
	`state` text,
	`photo_url` text,
	`status` text DEFAULT 'current' NOT NULL,
	`entered_parliament` text,
	FOREIGN KEY (`electorate_id`) REFERENCES `electorates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `polly_daily_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`politician_id` integer NOT NULL,
	`date` text NOT NULL,
	`approval_pct` real,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`pass_count` integer DEFAULT 0 NOT NULL,
	`fail_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`politician_id`) REFERENCES `politicians`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_polly_daily_stats_unique` ON `polly_daily_stats` (`politician_id`,`date`);--> statement-breakpoint
CREATE TABLE `rss_feeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`feed_url` text NOT NULL,
	`category` text,
	`poll_interval_mins` integer DEFAULT 15 NOT NULL,
	`last_polled_at` integer,
	`last_article_guid` text,
	`status` text DEFAULT 'active' NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain` text NOT NULL,
	`name` text NOT NULL,
	`tier` integer DEFAULT 3 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_domain_unique` ON `sources` (`domain`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_hash` text NOT NULL,
	`url` text NOT NULL,
	`headline` text NOT NULL,
	`description` text,
	`source_id` integer,
	`published_at` integer,
	`submitted_at` integer NOT NULL,
	`submitted_by` text,
	`thumbnail_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`cluster_id` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cluster_id`) REFERENCES `story_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stories_url_hash_unique` ON `stories` (`url_hash`);--> statement-breakpoint
CREATE INDEX `idx_stories_status_submitted` ON `stories` (`status`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `story_clusters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`primary_story_id` integer,
	`created_at` integer NOT NULL,
	`story_count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `story_politicians` (
	`story_id` integer NOT NULL,
	`politician_id` integer NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`politician_id`) REFERENCES `politicians`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_story_politicians_unique` ON `story_politicians` (`story_id`,`politician_id`);--> statement-breakpoint
CREATE INDEX `idx_story_politicians_politician` ON `story_politicians` (`politician_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`electorate_id` integer,
	`is_admin` integer DEFAULT false NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`ip_hash` text,
	`created_at` integer NOT NULL,
	`last_active` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`electorate_id`) REFERENCES `electorates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`cluster_id` integer NOT NULL,
	`vote` text NOT NULL,
	`ip_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cluster_id`) REFERENCES `story_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_votes_user_cluster` ON `votes` (`user_id`,`cluster_id`);