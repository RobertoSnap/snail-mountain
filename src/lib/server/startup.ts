import { env } from '$env/dynamic/private';

const REQUIRED_ENV_VARS = [
	'DATABASE_URL',
	'ORIGIN',
	'BETTER_AUTH_SECRET',
	'LINEAR_CLIENT_ID',
	'LINEAR_CLIENT_SECRET',
	'LINEAR_WEBHOOK_SECRET'
] as const;

export function validateEnv(): void {
	const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);

	if (missing.length > 0) {
		console.error('Missing required environment variables:');
		for (const key of missing) {
			console.error(`  - ${key}`);
		}
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}
}
