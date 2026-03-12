import { env as rawEnv } from '$env/dynamic/private';
import { z } from 'zod';

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	ORIGIN: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(1)
});

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
	const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
	throw new Error(`Missing or invalid environment variables: ${missing}`);
}

export const env = parsed.data;
