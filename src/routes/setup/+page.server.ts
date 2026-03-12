import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/auth.schema';
import { project } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { LinearClient } from '@linear/sdk';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	// Check Linear connection
	const linearAccount = await db
		.select({ accessToken: account.accessToken })
		.from(account)
		.where(and(eq(account.userId, event.locals.user.id), eq(account.providerId, 'linear')))
		.get();

	let linearConnected = false;
	let linearTeams: { id: string; name: string; key: string }[] = [];
	let linearError: string | null = null;

	if (linearAccount?.accessToken) {
		try {
			const client = new LinearClient({ accessToken: linearAccount.accessToken });
			await client.viewer;
			const teamsData = await client.teams();

			linearConnected = true;
			linearTeams = teamsData.nodes.map((t) => ({
				id: t.id,
				name: t.name,
				key: t.key
			}));
		} catch {
			linearError = 'Kunne ikke hente data fra Linear';
		}
	}

	// Load existing projects
	const projects = await db
		.select({
			id: project.id,
			name: project.name,
			linearTeamId: project.linearTeamId,
			githubRepo: project.githubRepo,
			aiProvider: project.aiProvider
		})
		.from(project)
		.where(eq(project.userId, event.locals.user.id))
		.all();

	return {
		linearConnected,
		linearTeams,
		linearError,
		projects
	};
};

export const actions: Actions = {
	createProject: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const name = (formData.get('name') as string)?.trim();
		const linearTeamId = formData.get('linearTeamId') as string;
		const aiProvider = formData.get('aiProvider') as string;
		const aiApiKey = (formData.get('aiApiKey') as string)?.trim();
		const githubRepo = (formData.get('githubRepo') as string)?.trim() || null;

		if (!name) {
			return fail(400, { error: 'Prosjektnavn er påkrevd' });
		}

		if (!aiApiKey) {
			return fail(400, { error: 'API-nøkkel er påkrevd' });
		}

		if (!['anthropic', 'openai'].includes(aiProvider)) {
			return fail(400, { error: 'Ugyldig AI-leverandør' });
		}

		// Get the Linear access token from the account table
		const linearAccount = await db
			.select({ accessToken: account.accessToken })
			.from(account)
			.where(and(eq(account.userId, event.locals.user.id), eq(account.providerId, 'linear')))
			.get();

		await db.insert(project).values({
			name,
			userId: event.locals.user.id,
			linearAccessToken: linearAccount?.accessToken ?? null,
			linearTeamId: linearTeamId || null,
			aiProvider,
			aiApiKey,
			githubRepo
		});

		// Set the env var for immediate use
		if (aiProvider === 'anthropic') {
			process.env.ANTHROPIC_API_KEY = aiApiKey;
		}

		return { success: true };
	}
};
