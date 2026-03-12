import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLinearWebhook(body: string, signature: string, secret: string): boolean {
	const hmac = createHmac('sha256', secret);
	hmac.update(body);
	const expected = hmac.digest('hex');

	try {
		return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
	} catch {
		return false;
	}
}
