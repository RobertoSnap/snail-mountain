import { db } from '$lib/server/db';
import { runs } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { loadConfig } from '$lib/server/config';
import { processIssue } from '$lib/server/pipeline/issue-pipeline';

let processing = false;

async function getRunningCount(): Promise<number> {
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(runs)
		.where(eq(runs.status, 'running'))
		.get();
	return result?.count ?? 0;
}

async function getNextQueued() {
	return await db
		.select()
		.from(runs)
		.where(eq(runs.status, 'queued'))
		.orderBy(runs.createdAt)
		.limit(1)
		.get();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function enqueue(_runId: string): Promise<void> {
	await processQueue();
}

export async function processQueue(): Promise<void> {
	if (processing) return;
	processing = true;

	try {
		const config = loadConfig();
		const maxParallel = config.concurrency.max_parallel;

		while (true) {
			const running = await getRunningCount();
			if (running >= maxParallel) break;

			const next = await getNextQueued();
			if (!next) break;

			// Start processing — don't await, let it run in background
			// The atomic claim in processIssue prevents duplicate pickup
			processIssue(next.id)
				.catch((err) => {
					console.error(`Pipeline failed for run ${next.id}:`, err);
				})
				.finally(() => {
					// When done, try to process next in queue
					processQueue();
				});
		}
	} finally {
		processing = false;
	}
}

export async function getQueueStatus(): Promise<{
	running: number;
	queued: number;
	maxParallel: number;
}> {
	const config = loadConfig();
	const running = await getRunningCount();
	const queuedResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(runs)
		.where(eq(runs.status, 'queued'))
		.get();

	return {
		running,
		queued: queuedResult?.count ?? 0,
		maxParallel: config.concurrency.max_parallel
	};
}
