import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/auth.schema';
import { project } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const PUBLIC_PATHS = ['/login', '/api/webhook', '/api/auth', '/api/linear'];

export const load: LayoutServerLoad = async (event) => {
	const { pathname } = event.url;
	const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

	if (!isPublic && !event.locals.user) {
		throw redirect(302, '/login');
	}

	let hasLinearConnection = false;
	let hasProjects = false;
	if (event.locals.user) {
		const linearAccount = await db
			.select({ id: account.id })
			.from(account)
			.where(and(eq(account.userId, event.locals.user.id), eq(account.providerId, 'linear')))
			.get();
		hasLinearConnection = !!linearAccount;

		const firstProject = await db
			.select({ id: project.id })
			.from(project)
			.where(eq(project.userId, event.locals.user.id))
			.get();
		hasProjects = !!firstProject;
	}

	// Redirect to setup if logged in but missing Linear connection or projects
	if (
		event.locals.user &&
		(!hasLinearConnection || !hasProjects) &&
		!isPublic &&
		!pathname.startsWith('/setup')
	) {
		throw redirect(302, '/setup');
	}

	return { user: event.locals.user ?? null, hasLinearConnection, hasProjects };
};
