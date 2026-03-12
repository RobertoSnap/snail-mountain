import { db } from '$lib/server/db';
import { runs, auditLog } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { loadConfig } from '$lib/server/config';
import { getLinearAgentUserId } from '$lib/server/integrations/linear';
import { enqueue } from '$lib/server/queue';
import { resumeWithAnswer } from '$lib/server/pipeline/resume-pipeline';

export interface WebhookPayload {
	action: string;
	type: string;
	data: Record<string, unknown>;
	createdAt?: string;
}

export interface RouteResult {
	ok: boolean;
	ignored?: boolean;
	reason?: string;
	runId?: string;
}

export async function routeWebhook(payload: WebhookPayload): Promise<RouteResult> {
	const { action, type, data } = payload;

	if (type === 'Issue') {
		return routeIssueEvent(action, data);
	}

	if (type === 'Comment') {
		return routeCommentEvent(action, data);
	}

	return { ok: true, ignored: true, reason: `unhandled type: ${type}` };
}

async function routeIssueEvent(
	action: string,
	data: Record<string, unknown>
): Promise<RouteResult> {
	const config = loadConfig();
	const agentUserId = await getLinearAgentUserId();
	const teamId = data.teamId as string;
	const issueId = (data.identifier ?? data.id) as string;
	const issueTitle = (data.title as string) ?? 'Untitled';

	// Find repo for this team
	const repoEntry = Object.entries(config.repos).find(([, repo]) => repo.linear_team_id === teamId);
	if (!repoEntry) {
		return { ok: true, ignored: true, reason: 'no repo for team' };
	}
	const [repoKey] = repoEntry;

	// Issue assigned to agent
	if (action === 'update' && data.assigneeId === agentUserId) {
		return handleIssueAssigned(issueId, issueTitle, repoKey);
	}

	// Issue unassigned from agent (or assigned to someone else)
	if (action === 'update' && data.assigneeId !== agentUserId) {
		// Check if there's an updatedFrom with assigneeId that was our agent
		const updatedFrom = data.updatedFrom as Record<string, unknown> | undefined;
		if (updatedFrom?.assigneeId === agentUserId) {
			return handleIssueUnassigned(issueId, repoKey);
		}
	}

	// Issue deleted or archived
	if (action === 'remove') {
		return handleIssueRemoved(issueId, repoKey);
	}

	return { ok: true, ignored: true, reason: 'not a relevant issue event' };
}

async function handleIssueAssigned(
	issueId: string,
	issueTitle: string,
	repoKey: string
): Promise<RouteResult> {
	// Idempotency: skip if already processing
	const existing = await db
		.select()
		.from(runs)
		.where(and(eq(runs.issueId, issueId), eq(runs.repoKey, repoKey)))
		.get();

	if (existing && existing.status !== 'failed') {
		return { ok: true, ignored: true, reason: 'already processing' };
	}

	// Create or reset run
	const [run] = await db
		.insert(runs)
		.values({
			issueId,
			issueTitle,
			repoKey,
			status: 'queued'
		})
		.onConflictDoUpdate({
			target: [runs.issueId, runs.repoKey],
			set: { status: 'queued', errorMessage: null, updatedAt: new Date().toISOString() }
		})
		.returning();

	await db.insert(auditLog).values({
		runId: run.id,
		eventType: 'run_queued',
		payloadJson: JSON.stringify({ issueId, repoKey })
	});

	enqueue(run.id).catch((err) => {
		console.error('Queue processing failed:', err);
	});

	return { ok: true, runId: run.id };
}

async function handleIssueUnassigned(issueId: string, repoKey: string): Promise<RouteResult> {
	const existing = await db
		.select()
		.from(runs)
		.where(and(eq(runs.issueId, issueId), eq(runs.repoKey, repoKey)))
		.get();

	if (!existing || existing.status === 'done' || existing.status === 'failed') {
		return { ok: true, ignored: true, reason: 'no active run to cancel' };
	}

	await db
		.update(runs)
		.set({
			status: 'failed',
			errorMessage: 'Issue unassigned from agent',
			updatedAt: new Date().toISOString(),
			completedAt: new Date().toISOString()
		})
		.where(eq(runs.id, existing.id));

	await db.insert(auditLog).values({
		runId: existing.id,
		eventType: 'run_cancelled',
		payloadJson: JSON.stringify({ reason: 'unassigned' })
	});

	return { ok: true, reason: 'run cancelled' };
}

async function handleIssueRemoved(issueId: string, repoKey: string): Promise<RouteResult> {
	const existing = await db
		.select()
		.from(runs)
		.where(and(eq(runs.issueId, issueId), eq(runs.repoKey, repoKey)))
		.get();

	if (!existing || existing.status === 'done' || existing.status === 'failed') {
		return { ok: true, ignored: true, reason: 'no active run' };
	}

	await db
		.update(runs)
		.set({
			status: 'failed',
			errorMessage: 'Issue deleted or archived',
			updatedAt: new Date().toISOString(),
			completedAt: new Date().toISOString()
		})
		.where(eq(runs.id, existing.id));

	await db.insert(auditLog).values({
		runId: existing.id,
		eventType: 'run_cancelled',
		payloadJson: JSON.stringify({ reason: 'issue_removed' })
	});

	return { ok: true, reason: 'run cancelled' };
}

async function routeCommentEvent(
	action: string,
	data: Record<string, unknown>
): Promise<RouteResult> {
	if (action !== 'create') {
		return { ok: true, ignored: true, reason: 'not a new comment' };
	}

	const agentUserId = await getLinearAgentUserId();
	const userId = data.userId as string | undefined;

	// Ignore comments from the agent itself
	if (userId === agentUserId) {
		return { ok: true, ignored: true, reason: 'agent comment ignored' };
	}

	const issue = data.issue as Record<string, unknown> | undefined;
	const issueId = (data.issueId ?? issue?.id) as string | undefined;
	if (!issueId) {
		return { ok: true, ignored: true, reason: 'no issue ID in comment' };
	}

	// Find run waiting for input
	const run = await db
		.select()
		.from(runs)
		.where(and(eq(runs.issueId, issueId), eq(runs.status, 'needs_input')))
		.get();

	if (!run) {
		return { ok: true, ignored: true, reason: 'no run waiting for input' };
	}

	const commentBody = (data.body as string) ?? '';

	await db.insert(auditLog).values({
		runId: run.id,
		eventType: 'user_reply_received',
		payloadJson: JSON.stringify({ body: commentBody, userId })
	});

	// Resume the run with the user's answer
	resumeWithAnswer(run.id, commentBody).catch((err) => {
		console.error(`Resume failed for run ${run.id}:`, err);
	});

	return { ok: true, reason: 'resuming run with answer' };
}
