import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { hashPassword } from 'better-auth/crypto';
import { user, account, session, verification } from './auth.schema';
import * as appSchema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: DATABASE_URL });
const db = drizzle(client);

const EMAIL = 'robin@localhost.com';
const PASSWORD = '123';
const NAME = 'robin';

async function seed() {
	// Wipe all tables
	await db.delete(verification);
	await db.delete(session);
	await db.delete(appSchema.auditLog);
	await db.delete(appSchema.runs);
	await db.delete(account);
	await db.delete(user);
	console.log('Cleared database.');

	const userId = crypto.randomUUID();
	const hashedPassword = await hashPassword(PASSWORD);
	const now = new Date();

	await db.insert(user).values({
		id: userId,
		name: NAME,
		email: EMAIL,
		emailVerified: false,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(account).values({
		id: crypto.randomUUID(),
		userId,
		accountId: userId,
		providerId: 'credential',
		password: hashedPassword,
		createdAt: now,
		updatedAt: now
	});

	console.log(`Created user "${EMAIL}" with password "${PASSWORD}".`);
}

seed().catch(console.error);
