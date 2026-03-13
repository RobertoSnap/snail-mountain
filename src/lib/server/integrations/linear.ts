import { LinearClient } from '@linear/sdk';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';

export function createLinearClient(accessToken: string): LinearClient {
	return new LinearClient({ accessToken });
}

export async function getDefaultLinearToken(): Promise<string> {
	const row = await db
		.select({ accessToken: account.accessToken })
		.from(account)
		.where(eq(account.providerId, 'linear'))
		.limit(1)
		.get();
	if (!row?.accessToken) {
		throw new Error('No Linear connection found. Connect Linear in /setup first.');
	}
	return row.accessToken;
}

async function getDefaultClient(): Promise<LinearClient> {
	const token = await getDefaultLinearToken();
	return createLinearClient(token);
}

let cachedAgentUserId: string | null = null;

export async function getLinearAgentUserId(): Promise<string> {
	if (cachedAgentUserId) return cachedAgentUserId;
	const client = await getDefaultClient();
	const viewer = await client.viewer;
	cachedAgentUserId = viewer.id;
	return cachedAgentUserId;
}

export function clearLinearCache(): void {
	cachedAgentUserId = null;
}

export interface IssueContext {
	id: string;
	identifier: string;
	title: string;
	description: string | undefined;
	labels: string[];
	comments: string[];
	teamId: string;
}

export async function fetchIssueContext(issueId: string): Promise<IssueContext> {
	const client = await getDefaultClient();
	const issue = await client.issue(issueId);
	const labelsData = await issue.labels();
	const commentsData = await issue.comments();
	const team = await issue.team;

	return {
		id: issue.id,
		identifier: issue.identifier,
		title: issue.title,
		description: issue.description ?? undefined,
		labels: labelsData.nodes.map((l) => l.name),
		comments: commentsData.nodes.map((c) => c.body),
		teamId: team?.id ?? ''
	};
}

export async function postComment(issueId: string, body: string): Promise<void> {
	const client = await getDefaultClient();
	await client.createComment({ issueId, body });
}

export async function updateIssueStatus(issueId: string, stateId: string): Promise<void> {
	const client = await getDefaultClient();
	await client.updateIssue(issueId, { stateId });
}

export async function findStateId(teamId: string, stateName: string): Promise<string | null> {
	const client = await getDefaultClient();
	const team = await client.team(teamId);
	const states = await team.states();
	const state = states.nodes.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
	return state?.id ?? null;
}
