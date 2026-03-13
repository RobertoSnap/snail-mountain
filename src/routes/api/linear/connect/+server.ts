import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import crypto from 'node:crypto';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	const state = crypto.randomBytes(32).toString('hex');

	// Store state in a cookie for CSRF verification
	event.cookies.set('linear_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: env.ORIGIN?.startsWith('https'),
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	const params = new URLSearchParams({
		client_id: env.LINEAR_CLIENT_ID!,
		redirect_uri: `${env.ORIGIN}/api/linear/callback`,
		response_type: 'code',
		scope: 'read,write',
		state
	});

	throw redirect(302, `https://linear.app/oauth/authorize?${params}`);
};
