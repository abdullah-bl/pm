CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`task_id` text NOT NULL,
	`comment_id` text,
	`uploaded_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attachment_taskId_idx` ON `attachment` (`task_id`);--> statement-breakpoint
CREATE INDEX `attachment_commentId_idx` ON `attachment` (`comment_id`);--> statement-breakpoint
CREATE TABLE `collection_member` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'write' NOT NULL,
	`status` text DEFAULT 'accepted' NOT NULL,
	`invited_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`accepted_at` integer,
	FOREIGN KEY (`collection_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_member_collectionId_idx` ON `collection_member` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_member_userId_idx` ON `collection_member` (`user_id`);--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`task_id` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comment_taskId_idx` ON `comment` (`task_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` integer,
	`project_id` text NOT NULL,
	`assignee_id` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_projectId_idx` ON `task` (`project_id`);--> statement-breakpoint
CREATE TABLE `budget` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`reference_number` text NOT NULL,
	`economic_code` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_reference_number_unique` ON `budget` (`reference_number`);--> statement-breakpoint
CREATE TABLE `budget_transfer` (
	`id` text PRIMARY KEY NOT NULL,
	`from_budget_year_id` text NOT NULL,
	`to_budget_year_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`transferred_at` integer,
	`transferred_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`from_budget_year_id`) REFERENCES `budget_year`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_budget_year_id`) REFERENCES `budget_year`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transfer_from` ON `budget_transfer` (`from_budget_year_id`);--> statement-breakpoint
CREATE INDEX `idx_transfer_to` ON `budget_transfer` (`to_budget_year_id`);--> statement-breakpoint
CREATE TABLE `budget_year` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`year` integer NOT NULL,
	`cash` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`consumed_cash` real DEFAULT 0 NOT NULL,
	`consumed_credit` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budget`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_budget_year_budget` ON `budget_year` (`budget_id`,`year`);--> statement-breakpoint
CREATE TABLE `obligation` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_number` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`procurement_id` text NOT NULL,
	`budget_year_id` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`procurement_id`) REFERENCES `procurement`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_year_id`) REFERENCES `budget_year`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `obligation_reference_number_unique` ON `obligation` (`reference_number`);--> statement-breakpoint
CREATE INDEX `idx_obligation_procurement` ON `obligation` (`procurement_id`);--> statement-breakpoint
CREATE INDEX `idx_obligation_budget_year` ON `obligation` (`budget_year_id`);--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_number` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text,
	`paid_date` text,
	`payment_method` text,
	`obligation_id` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`obligation_id`) REFERENCES `obligation`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reference_number_unique` ON `payment` (`reference_number`);--> statement-breakpoint
CREATE INDEX `idx_payment_obligation` ON `payment` (`obligation_id`);--> statement-breakpoint
CREATE TABLE `procurement` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_number` text NOT NULL,
	`tender_number` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`type` text NOT NULL,
	`vendor_id` text,
	`awarded_amount` real,
	`start_date` text,
	`end_date` text,
	`actual_end_date` text,
	`cancelled_at` integer,
	`suspended_at` integer,
	`cancellation_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `procurement_reference_number_unique` ON `procurement` (`reference_number`);--> statement-breakpoint
CREATE INDEX `idx_procurement_status` ON `procurement` (`status`);--> statement-breakpoint
CREATE INDEX `idx_procurement_vendor` ON `procurement` (`vendor_id`);--> statement-breakpoint
CREATE TABLE `procurement_member` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'read' NOT NULL,
	`granted_by` text NOT NULL,
	`granted_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `procurement_member_userId_idx` ON `procurement_member` (`user_id`);--> statement-breakpoint
CREATE TABLE `procurement_status_log` (
	`id` text PRIMARY KEY NOT NULL,
	`procurement_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`changed_by` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`procurement_id`) REFERENCES `procurement`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_procurement_status_log_proc` ON `procurement_status_log` (`procurement_id`);--> statement-breakpoint
CREATE TABLE `vendor` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`category` text,
	`license_number` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
