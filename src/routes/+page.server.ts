import { db } from '$lib/server/db';
import { runs } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allRuns = await db.select().from(runs).orderBy(desc(runs.createdAt)).limit(50);

	return { runs: allRuns };
};
