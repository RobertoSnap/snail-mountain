import { db } from '$lib/server/db';
import { runs, auditLog } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { loadConfig } from '$lib/server/config';
import {
	fetchIssueContext,
	postComment,
	findStateId,
	updateIssueStatus
} from '$lib/server/integrations/linear';
import { createWorktree, removeWorktree, runSetupScript } from './worktree';
import { buildPrompt } from './prompt-builder';
import { runAgent } from '$lib/server/integrations/claude';
import { commitAndPush, createPullRequest } from '$lib/server/integrations/github';
import { notifySlack } from '$lib/server/integrations/slack';
import { verifyAndFix } from './verify';

const RUN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function updateRun(runId: string, data: Record<string, unknown>) {
	await db
		.update(runs)
		.set({ ...data, updatedAt: new Date().toISOString() })
		.where(eq(runs.id, runId));
}

async function logEvent(runId: string, eventType: string, payload?: unknown) {
	await db.insert(auditLog).values({
		runId,
		eventType,
		payloadJson: payload ? JSON.stringify(payload) : null
	});
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms);
		promise.then(resolve, reject).finally(() => clearTimeout(timer));
	});
}

export async function processIssue(runId: string): Promise<void> {
	// Atomic claim: only proceed if we successfully transition from queued → running
	const claimed = await db
		.update(runs)
		.set({ status: 'running', updatedAt: new Date().toISOString() })
		.where(and(eq(runs.id, runId), eq(runs.status, 'queued')))
		.run();

	if ((claimed as unknown as { changes: number }).changes === 0) {
		console.warn(`Run ${runId} not found or already claimed, skipping`);
		return;
	}

	const run = await db.select().from(runs).where(eq(runs.id, runId)).get();
	if (!run) throw new Error(`Run ${runId} not found`);

	const config = loadConfig();
	const repoConfig = config.repos[run.repoKey];
	if (!repoConfig) throw new Error(`Repo ${run.repoKey} not found in config`);

	let worktreePath: string | null = null;

	try {
		await logEvent(runId, 'run_started');

		// 2. Fetch full issue context from Linear
		const issue = await withTimeout(fetchIssueContext(run.issueId), 30_000, 'fetch issue context');
		await logEvent(runId, 'issue_fetched', { identifier: issue.identifier });

		// 3. Update Linear status to "In Progress"
		try {
			const inProgressStateId = await findStateId(issue.teamId, 'In Progress');
			if (inProgressStateId) {
				await updateIssueStatus(issue.id, inProgressStateId);
			}
			await postComment(issue.id, '🤖 Agent har startet arbeid på denne issuen.');
		} catch (linearErr) {
			console.warn('Failed to update Linear status:', linearErr);
		}

		// 4. Create worktree
		const branchName = `agent/${issue.identifier.toLowerCase()}-${slugify(issue.title)}`;
		try {
			worktreePath = await createWorktree(repoConfig.path, branchName, repoConfig.worktree_dir);
		} catch (err) {
			// Worktree might already exist from a previous failed attempt
			const fallbackPath = `${repoConfig.worktree_dir}/${branchName.replace(/\//g, '-')}`;
			const { existsSync } = await import('node:fs');
			if (existsSync(fallbackPath)) {
				console.warn(`Worktree already exists at ${fallbackPath}, reusing`);
				worktreePath = fallbackPath;
			} else {
				throw err;
			}
		}
		await updateRun(runId, { worktreePath, branchName });
		await logEvent(runId, 'worktree_created', { worktreePath, branchName });

		// 5. Run setup script if configured
		if (repoConfig.setup_script) {
			try {
				await withTimeout(
					runSetupScript(worktreePath, repoConfig.setup_script),
					120_000,
					'setup script'
				);
				await logEvent(runId, 'setup_script_completed');
			} catch (err) {
				console.warn('Setup script failed, continuing:', err);
				await logEvent(runId, 'setup_script_failed', {
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}

		// 6. Build prompt
		const { prompt, model, maxBudgetUsd, allowedTools } = buildPrompt(issue, repoConfig);
		await updateRun(runId, { model, budgetUsd: maxBudgetUsd });

		// 7. Run Claude Code with timeout
		await logEvent(runId, 'agent_started', { model, maxBudgetUsd });
		const result = await withTimeout(
			runAgent({
				prompt,
				cwd: worktreePath,
				model,
				maxBudgetUsd,
				allowedTools
			}),
			RUN_TIMEOUT_MS,
			'agent session'
		);

		if (result.sessionId) {
			await updateRun(runId, { sdkSessionId: result.sessionId });
		}
		if (result.costUsd != null) {
			await updateRun(runId, { costUsd: result.costUsd });
		}

		if (!result.success) {
			throw new Error('Agent exceeded budget or failed');
		}
		await logEvent(runId, 'agent_completed');

		// 7b. Self-verification loop (run tests if configured)
		if (repoConfig.test_command) {
			await updateRun(runId, { status: 'verifying' });
			await logEvent(runId, 'verification_started');

			const verifyResult = await verifyAndFix({
				worktreePath,
				testCommand: repoConfig.test_command,
				model,
				maxBudgetUsd,
				allowedTools
			});

			if (verifyResult.totalCostUsd > 0) {
				const currentCost = (result.costUsd ?? 0) + verifyResult.totalCostUsd;
				await updateRun(runId, { costUsd: currentCost });
			}

			if (!verifyResult.passed) {
				throw new Error(
					`Tests failed after ${verifyResult.attempts} attempts: ${verifyResult.lastError ?? 'unknown error'}`
				);
			}

			await logEvent(runId, 'verification_passed', {
				attempts: verifyResult.attempts
			});
			await updateRun(runId, { status: 'running' });
		}

		// 8. Commit and push
		const commitMessage = `feat(${issue.identifier}): ${issue.title}`;
		try {
			await withTimeout(
				commitAndPush(worktreePath, branchName, commitMessage),
				60_000,
				'commit and push'
			);
			await logEvent(runId, 'changes_pushed');
		} catch (err) {
			throw new Error(
				`Failed to push changes: ${err instanceof Error ? err.message : String(err)}`
			);
		}

		// 9. Create PR
		const prBody = [
			`Resolves ${issue.identifier}`,
			'',
			issue.description ?? '',
			'',
			'---',
			'*This PR was generated automatically by SnailMountain.*'
		].join('\n');

		let prUrl: string;
		try {
			prUrl = await withTimeout(
				createPullRequest(
					worktreePath,
					`${issue.identifier}: ${issue.title}`,
					prBody,
					repoConfig.base_branch
				),
				30_000,
				'create PR'
			);
		} catch (err) {
			throw new Error(`Failed to create PR: ${err instanceof Error ? err.message : String(err)}`);
		}
		await updateRun(runId, { prUrl });
		await logEvent(runId, 'pr_created', { prUrl });

		// 10. Update Linear to "In Review"
		try {
			const inReviewStateId = await findStateId(issue.teamId, 'In Review');
			if (inReviewStateId) {
				await updateIssueStatus(issue.id, inReviewStateId);
			}
			await postComment(
				issue.id,
				`✅ PR klar for review: ${prUrl}\n\nAgenten har fullført arbeidet.`
			);
		} catch (linearErr) {
			console.warn('Failed to update Linear after PR:', linearErr);
		}

		// 11. Notify Slack
		await notifySlack(`🎉 PR klar for review: ${issue.identifier} — ${issue.title}\n${prUrl}`);

		// 12. Mark run as done
		await updateRun(runId, {
			status: 'done',
			completedAt: new Date().toISOString()
		});
		await logEvent(runId, 'run_completed');

		// 13. Clean up worktree
		if (worktreePath) {
			await removeWorktree(repoConfig.path, worktreePath);
		}
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`Pipeline failed for run ${runId}:`, errorMessage);

		await updateRun(runId, {
			status: 'failed',
			errorMessage,
			completedAt: new Date().toISOString()
		});
		await logEvent(runId, 'error', { error: errorMessage });

		// Try to update Linear back to "Todo"
		try {
			const issue = await fetchIssueContext(run.issueId);
			const todoStateId = await findStateId(issue.teamId, 'Todo');
			if (todoStateId) {
				await updateIssueStatus(issue.id, todoStateId);
			}
			await postComment(issue.id, `❌ Agenten feilet:\n\n\`\`\`\n${errorMessage}\n\`\`\``);
		} catch (linearErr) {
			console.error('Failed to update Linear on error:', linearErr);
		}

		// Notify Slack about failure
		await notifySlack(`❌ Agent feilet på ${run.issueId}: ${errorMessage}`);

		// Clean up worktree on failure so retries can create a fresh branch
		if (worktreePath) {
			try {
				await removeWorktree(repoConfig.path, worktreePath);
			} catch (cleanupErr) {
				console.error('Failed to clean up worktree:', cleanupErr);
			}
		}
	}
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
}
