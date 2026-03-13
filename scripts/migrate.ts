import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: DATABASE_URL });
const db = drizzle(client);

async function main() {
	console.log('Running migrations...');
	await migrate(db, { migrationsFolder: './drizzle' });
	console.log('Migrations complete.');
	process.exit(0);
}

main().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
