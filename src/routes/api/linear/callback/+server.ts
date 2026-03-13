import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/auth.schema';
import { eq, and } from 'drizzle-orm';
import { clearLinearCache } from '$lib/server/integrations/linear';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const errorParam = event.url.searchParams.get('error');

	if (errorParam) {
		throw error(400, `Linear OAuth error: ${errorParam}`);
	}

	if (!code || !state) {
		throw error(400, 'Missing code or state parameter');
	}

	// Verify CSRF state
	const storedState = event.cookies.get('linear_oauth_state');
	event.cookies.delete('linear_oauth_state', { path: '/' });

	if (!storedState || storedState !== state) {
		throw error(400, 'Invalid OAuth state');
	}

	// Exchange code for token
	const tokenRes = await fetch('https://api.linear.app/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: `${env.ORIGIN}/api/linear/callback`,
			client_id: env.LINEAR_CLIENT_ID!,
			client_secret: env.LINEAR_CLIENT_SECRET!
		})
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		console.error('Linear token exchange failed:', text);
		throw error(502, 'Failed to exchange code for token');
	}

	const tokenData = (await tokenRes.json()) as { access_token: string; scope?: string };
	const accessToken = tokenData.access_token;

	// Fetch Linear user info
	const userRes = await fetch('https://api.linear.app/graphql', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`
		},
		body: JSON.stringify({
			query: `{ viewer { id name email displayName } }`
		})
	});

	const userData = (await userRes.json()) as {
		data?: { viewer?: { id: string; name: string; email: string; displayName?: string } };
	};
	const viewer = userData.data?.viewer;

	if (!viewer) {
		throw error(502, 'Failed to fetch Linear user info');
	}

	// Upsert the Linear account connection
	const existing = await db
		.select({ id: account.id })
		.from(account)
		.where(and(eq(account.userId, event.locals.user.id), eq(account.providerId, 'linear')))
		.get();

	if (existing) {
		await db
			.update(account)
			.set({
				accessToken,
				accountId: viewer.id,
				scope: tokenData.scope ?? 'read,write',
				updatedAt: new Date()
			})
			.where(eq(account.id, existing.id));
	} else {
		await db.insert(account).values({
			id: crypto.randomUUID(),
			userId: event.locals.user.id,
			providerId: 'linear',
			accountId: viewer.id,
			accessToken,
			scope: tokenData.scope ?? 'read,write',
			createdAt: new Date(),
			updatedAt: new Date()
		});
	}

	// Clear cached Linear data so it picks up the new token
	clearLinearCache();

	throw redirect(302, '/setup');
};
