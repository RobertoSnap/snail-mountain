import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { getQueueStatus } from '$lib/server/queue';

const startedAt = Date.now();

export const GET: RequestHandler = async () => {
	let dbOk = false;
	try {
		await db.run(sql`SELECT 1`);
		dbOk = true;
	} catch {
		// db unreachable
	}

	let queue = null;
	try {
		queue = await getQueueStatus();
	} catch {
		// queue status unavailable
	}

	const status = dbOk ? 'ok' : 'degraded';

	return json(
		{ status, database: dbOk, queue, uptimeMs: Date.now() - startedAt },
		{ status: dbOk ? 200 : 503 }
	);
};
