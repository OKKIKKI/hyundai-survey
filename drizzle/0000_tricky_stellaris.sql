CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`response_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`consent_at` text NOT NULL,
	`consent_version` text NOT NULL,
	`notice` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`answers` text NOT NULL,
	`prize` integer NOT NULL,
	`interview` text NOT NULL,
	`q11_applicable` integer NOT NULL,
	`receipt_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `responses_created` ON `responses` (`created_at`);