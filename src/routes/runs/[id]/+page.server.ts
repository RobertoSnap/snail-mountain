import { db } from '$lib/server/db';
import { runs, auditLog } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const run = await db.select().from(runs).where(eq(runs.id, params.id)).get();

	if (!run) {
		throw error(404, 'Run not found');
	}

	const events = await db
		.select()
		.from(auditLog)
		.where(eq(auditLog.runId, params.id))
		.orderBy(asc(auditLog.createdAt))
		.all();

	return { run, events };
};
