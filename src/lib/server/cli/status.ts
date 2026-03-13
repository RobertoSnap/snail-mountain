import { db } from '$lib/server/db';
import { runs } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';
import { loadConfig } from '$lib/server/config';

export async function runStatus(): Promise<void> {
	const config = loadConfig();

	// Count by status
	const counts = await db
		.select({
			status: runs.status,
			count: sql<number>`count(*)`
		})
		.from(runs)
		.groupBy(runs.status)
		.all();

	const countMap: Record<string, number> = {};
	for (const row of counts) {
		if (row.status) countMap[row.status] = row.count;
	}

	console.log('\n🐌 SnailMountain Status\n');
	console.log(`Max parallel: ${config.concurrency.max_parallel}`);
	console.log(`Repos: ${Object.keys(config.repos).join(', ')}`);
	console.log('');
	console.log(`Running:     ${countMap['running'] ?? 0}`);
	console.log(`Queued:      ${countMap['queued'] ?? 0}`);
	console.log(`Needs input: ${countMap['needs_input'] ?? 0}`);
	console.log(`Completed:   ${countMap['done'] ?? 0}`);
	console.log(`Failed:      ${countMap['failed'] ?? 0}`);

	// Show recent runs
	const recent = await db.select().from(runs).orderBy(desc(runs.updatedAt)).limit(10).all();

	if (recent.length > 0) {
		console.log('\n— Recent Runs —\n');
		console.log(
			padRight('Issue', 15) +
				padRight('Repo', 20) +
				padRight('Status', 15) +
				padRight('Model', 10) +
				'PR'
		);
		console.log('-'.repeat(70));

		for (const s of recent) {
			console.log(
				padRight(s.issueId, 15) +
					padRight(s.repoKey, 20) +
					padRight(s.status, 15) +
					padRight(s.model ?? '-', 10) +
					(s.prUrl ?? '-')
			);
		}
	}

	console.log('');
}

function padRight(str: string, len: number): string {
	return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}
