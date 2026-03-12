import { integer, sqliteTable, text, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { user } from './auth.schema';

export const runs = sqliteTable(
	'runs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		issueId: text('issue_id').notNull(),
		issueTitle: text('issue_title').notNull(),
		repoKey: text('repo_key').notNull(),
		status: text('status', {
			enum: ['queued', 'running', 'needs_input', 'verifying', 'done', 'failed']
		})
			.notNull()
			.default('queued'),
		worktreePath: text('worktree_path'),
		branchName: text('branch_name'),
		sdkSessionId: text('sdk_session_id'),
		model: text('model'),
		budgetUsd: real('budget_usd'),
		costUsd: real('cost_usd').default(0),
		prUrl: text('pr_url'),
		errorMessage: text('error_message'),
		createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
		completedAt: text('completed_at')
	},
	(table) => [
		uniqueIndex('idx_runs_issue_repo').on(table.issueId, table.repoKey),
		index('idx_runs_status').on(table.status)
	]
);

export const auditLog = sqliteTable(
	'audit_log',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		runId: text('run_id').references(() => runs.id),
		eventType: text('event_type').notNull(),
		payloadJson: text('payload_json'),
		createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`)
	},
	(table) => [index('idx_audit_run').on(table.runId)]
);

export const project = sqliteTable('project', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	linearAccessToken: text('linear_access_token'),
	aiProvider: text('ai_provider').default('anthropic'),
	aiApiKey: text('ai_api_key'),
	linearTeamId: text('linear_team_id'),
	githubRepo: text('github_repo'),
	createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`)
});

export const projectRelations = relations(project, ({ one }) => ({
	user: one(user, {
		fields: [project.userId],
		references: [user.id]
	})
}));

export * from './auth.schema';
