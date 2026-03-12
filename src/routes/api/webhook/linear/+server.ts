import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { verifyLinearWebhook } from '$lib/server/webhook';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { routeWebhook, type WebhookPayload } from '$lib/server/event-router';

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.LINEAR_WEBHOOK_SECRET;
	if (!secret) {
		throw error(500, 'LINEAR_WEBHOOK_SECRET not configured');
	}

	const body = await request.text();
	const signature = request.headers.get('linear-signature') ?? '';

	if (!verifyLinearWebhook(body, signature, secret)) {
		throw error(401, 'Invalid signature');
	}

	let payload: unknown;
	try {
		payload = JSON.parse(body);
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (
		!payload ||
		typeof payload !== 'object' ||
		!('action' in payload) ||
		!('type' in payload) ||
		!('data' in payload)
	) {
		return json({ error: 'Missing required fields: action, type, data' }, { status: 400 });
	}

	// Log webhook receipt
	await db.insert(auditLog).values({
		eventType: 'webhook_received',
		payloadJson: body
	});

	const result = await routeWebhook(payload as WebhookPayload);
	return json(result);
};
