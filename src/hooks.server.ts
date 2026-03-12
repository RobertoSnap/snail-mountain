import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { validateEnv } from '$lib/server/startup';
import { recoverStaleRuns } from '$lib/server/recover';

if (!building) {
	validateEnv();
	recoverStaleRuns().catch((err) => {
		console.error('Failed to recover stale runs:', err);
	});
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
