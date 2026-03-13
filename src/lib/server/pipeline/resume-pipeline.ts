import { db } from '$lib/server/db';
import { runs, auditLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { loadConfig } from '$lib/server/config';
import {
	postComment,
	findStateId,
	updateIssueStatus,
	fetchIssueContext
} from '$lib/server/integrations/linear';
import { resumeAgentSession, sendAndCollect } from '$lib/server/integrations/claude';
import { commitAndPush, createPullRequest } from '$lib/server/integrations/github';
import { removeWorktree } from './worktree';
import { notifySlack } from '$lib/server/integrations/slack';

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

export async function resumeWithAnswer(runId: string, answer: string): Promise<void> {
	const run = await db.select().from(runs).where(eq(runs.id, runId)).get();
	if (!run) throw new Error(`Run ${runId} not found`);
	if (run.status !== 'needs_input') {
		console.warn(`Run ${runId} is ${run.status}, not needs_input`);
		return;
	}
	if (!run.sdkSessionId) {
		throw new Error(`Run ${runId} has no SDK session ID for resume`);
	}

	const config = loadConfig();
	const repoConfig = config.repos[run.repoKey];
	if (!repoConfig) throw new Error(`Repo ${run.repoKey} not found in config`);

	try {
		// Update status back to running
		await updateRun(runId, { status: 'running' });
		await logEvent(runId, 'run_resumed', { answer });

		// Update Linear
		try {
			const issue = await fetchIssueContext(run.issueId);
			const inProgressStateId = await findStateId(issue.teamId, 'In Progress');
			if (inProgressStateId) {
				await updateIssueStatus(issue.id, inProgressStateId);
			}
			await postComment(issue.id, '🤖 Agent fortsetter med svaret ditt.');
		} catch (err) {
			console.warn('Failed to update Linear on resume:', err);
		}

		// Resume the SDK session
		const sdkSession = resumeAgentSession(run.sdkSessionId, {
			cwd: run.worktreePath!,
			model: run.model ?? 'sonnet',
			allowedTools: undefined
		});

		const result = await sendAndCollect(sdkSession, answer);

		if (result.costUsd != null) {
			await updateRun(runId, {
				costUsd: (run.costUsd ?? 0) + result.costUsd
			});
		}

		if (!result.success) {
			throw new Error('Agent exceeded budget or failed after resume');
		}
		await logEvent(runId, 'agent_completed_after_resume');

		// Commit, push, PR — same as main pipeline
		const branchName = run.branchName!;
		const worktreePath = run.worktreePath!;

		const issue = await fetchIssueContext(run.issueId);
		const commitMessage = `feat(${issue.identifier}): ${issue.title}`;
		await commitAndPush(worktreePath, branchName, commitMessage);
		await logEvent(runId, 'changes_pushed');

		const prBody = [
			`Resolves ${issue.identifier}`,
			'',
			issue.description ?? '',
			'',
			'---',
			'*This PR was generated automatically by SnailMountain.*'
		].join('\n');

		const prUrl = await createPullRequest(
			worktreePath,
			`${issue.identifier}: ${issue.title}`,
			prBody,
			repoConfig.base_branch
		);
		await updateRun(runId, { prUrl });
		await logEvent(runId, 'pr_created', { prUrl });

		// Update Linear
		try {
			const inReviewStateId = await findStateId(issue.teamId, 'In Review');
			if (inReviewStateId) {
				await updateIssueStatus(issue.id, inReviewStateId);
			}
			await postComment(
				issue.id,
				`✅ PR klar for review: ${prUrl}\n\nAgenten har fullført arbeidet.`
			);
		} catch (err) {
			console.warn('Failed to update Linear after PR:', err);
		}

		await notifySlack(`🎉 PR klar for review: ${issue.identifier} — ${issue.title}\n${prUrl}`);

		await updateRun(runId, {
			status: 'done',
			completedAt: new Date().toISOString()
		});
		await logEvent(runId, 'run_completed');

		await removeWorktree(repoConfig.path, worktreePath);

		// Close SDK session
		sdkSession.close();
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`Resume failed for run ${runId}:`, errorMessage);

		await updateRun(runId, {
			status: 'failed',
			errorMessage,
			completedAt: new Date().toISOString()
		});
		await logEvent(runId, 'error', { error: errorMessage });

		try {
			const issue = await fetchIssueContext(run.issueId);
			const todoStateId = await findStateId(issue.teamId, 'Todo');
			if (todoStateId) {
				await updateIssueStatus(issue.id, todoStateId);
			}
			await postComment(
				issue.id,
				`❌ Agenten feilet etter resume:\n\n\`\`\`\n${errorMessage}\n\`\`\``
			);
		} catch (linearErr) {
			console.error('Failed to update Linear on resume error:', linearErr);
		}

		await notifySlack(`❌ Agent feilet etter resume på ${run.issueId}: ${errorMessage}`);
	}
}
