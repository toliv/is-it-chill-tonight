CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`venueId` text NOT NULL,
	`mellowOrDancey` integer NOT NULL,
	`crowded` integer NOT NULL,
	`securityChill` integer NOT NULL,
	`ratio` integer NOT NULL,
	`lineSpeed` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`venueId`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade
);
