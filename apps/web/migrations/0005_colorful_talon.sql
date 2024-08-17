CREATE TABLE `eventSyncWatermarks` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`eventsSynced` integer DEFAULT 0 NOT NULL
);
