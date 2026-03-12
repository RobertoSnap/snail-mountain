import {
	query,
	unstable_v2_createSession,
	unstable_v2_resumeSession,
	type Query,
	type SDKMessage,
	type SDKSession
} from '@anthropic-ai/claude-agent-sdk';
import { db } from '$lib/server/db';
import { project } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function ensureApiKey(): Promise<void> {
	if (process.env.ANTHROPIC_API_KEY) return;

	const proj = await db
		.select({ aiApiKey: project.aiApiKey, aiProvider: project.aiProvider })
		.from(project)
		.where(eq(project.aiProvider, 'anthropic'))
		.get();

	if (proj?.aiApiKey) {
		process.env.ANTHROPIC_API_KEY = proj.aiApiKey;
	} else {
		throw new Error('No Anthropic API key configured. Please set it up in /setup.');
	}
}

export interface AgentOptions {
	prompt: string;
	cwd: string;
	allowedTools?: string[];
	model?: string;
	maxBudgetUsd?: number;
	onMessage?: (message: SDKMessage) => void;
}

export interface AgentResult {
	success: boolean;
	messages: SDKMessage[];
	sessionId?: string;
	costUsd?: number;
}

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
	await ensureApiKey();

	const q: Query = query({
		prompt: options.prompt,
		options: {
			cwd: options.cwd,
			allowedTools: options.allowedTools,
			model: options.model ?? 'sonnet',
			maxBudgetUsd: options.maxBudgetUsd ?? 5.0,
			persistSession: true
		}
	});

	const messages: SDKMessage[] = [];
	let success = true;
	let sessionId: string | undefined;
	let costUsd: number | undefined;

	for await (const message of q) {
		messages.push(message);
		options.onMessage?.(message);

		if (message.type === 'system' && message.subtype === 'init') {
			sessionId = message.session_id;
		}

		if (message.type === 'result') {
			sessionId = message.session_id;
			costUsd = message.total_cost_usd;
			if (message.subtype === 'error_max_budget_usd') {
				success = false;
			}
		}
	}

	return { success, messages, sessionId, costUsd };
}

export interface SessionAgentOptions {
	cwd: string;
	model: string;
	allowedTools?: string[];
}

export function createAgentSession(options: SessionAgentOptions): SDKSession {
	return unstable_v2_createSession({
		model: options.model,
		allowedTools: options.allowedTools,
		permissionMode: 'dontAsk'
	});
}

export function resumeAgentSession(sdkSessionId: string, options: SessionAgentOptions): SDKSession {
	return unstable_v2_resumeSession(sdkSessionId, {
		model: options.model,
		allowedTools: options.allowedTools,
		permissionMode: 'dontAsk'
	});
}

export async function sendAndCollect(
	session: SDKSession,
	message: string,
	onMessage?: (msg: SDKMessage) => void
): Promise<AgentResult> {
	await session.send(message);

	const messages: SDKMessage[] = [];
	let success = true;
	let costUsd: number | undefined;

	for await (const msg of session.stream()) {
		messages.push(msg);
		onMessage?.(msg);

		if (msg.type === 'result') {
			costUsd = msg.total_cost_usd;
			if (msg.subtype === 'error_max_budget_usd') {
				success = false;
			}
		}
	}

	return { success, messages, sessionId: session.sessionId, costUsd };
}
