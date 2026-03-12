ALTER TABLE `sessions` RENAME TO `runs`;--> statement-breakpoint
ALTER TABLE `audit_log` RENAME COLUMN `session_id` TO `run_id`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_sessions_issue_repo`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_sessions_status`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_audit_session`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_runs_issue_repo` ON `runs` (`issue_id`,`repo_key`);--> statement-breakpoint
CREATE INDEX `idx_runs_status` ON `runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_audit_run` ON `audit_log` (`run_id`);
