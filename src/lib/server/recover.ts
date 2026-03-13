import { db } from '$lib/server/db';
import { runs, auditLog } from '$lib/server/db/schema';
import { inArray, sql } from 'drizzle-orm';

/**
 * Recover runs stuck in transient states after a server restart.
 * Marks 'running' and 'verifying' runs as failed.
 */
export async function recoverStaleRuns(): Promise<void> {
	const stale = await db
		.select({ id: runs.id, status: runs.status })
		.from(runs)
		.where(inArray(runs.status, ['running', 'verifying']))
		.all();

	if (stale.length === 0) return;

	console.warn(`Recovering ${stale.length} stale run(s) after restart`);

	for (const s of stale) {
		await db
			.update(runs)
			.set({
				status: 'failed',
				errorMessage: 'Server restartet under prosessering',
				updatedAt: sql`(CURRENT_TIMESTAMP)`
			})
			.where(inArray(runs.id, [s.id]));

		await db.insert(auditLog).values({
			runId: s.id,
			eventType: 'run_recovered',
			payloadJson: JSON.stringify({
				previousStatus: s.status,
				reason: 'server_restart'
			})
		});
	}
}
