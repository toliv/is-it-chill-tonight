CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artistNames` text NOT NULL,
	`startTime` integer NOT NULL,
	`endTime` integer NOT NULL,
	`venueId` text NOT NULL,
	FOREIGN KEY (`venueId`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
