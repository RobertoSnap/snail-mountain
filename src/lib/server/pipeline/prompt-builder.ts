import type { IssueContext } from '$lib/server/integrations/linear';
import type { RepoConfig, RepoLabelConfig } from '$lib/server/config';

export interface BuiltPrompt {
	prompt: string;
	model: string;
	maxBudgetUsd: number;
	allowedTools?: string[];
}

export function buildPrompt(issue: IssueContext, repoConfig: RepoConfig): BuiltPrompt {
	// Find matching label config
	let labelConfig: RepoLabelConfig | undefined;
	if (repoConfig.labels) {
		for (const label of issue.labels) {
			if (repoConfig.labels[label]) {
				labelConfig = repoConfig.labels[label];
				break;
			}
		}
	}

	const model = labelConfig?.model ?? repoConfig.default_model ?? 'sonnet';
	const maxBudgetUsd = labelConfig?.max_budget_usd ?? repoConfig.default_max_budget_usd ?? 5.0;
	const allowedTools = labelConfig?.tools;

	const parts: string[] = [];

	parts.push(`# Task: ${issue.identifier} — ${issue.title}`);
	parts.push('');

	if (issue.description) {
		parts.push('## Description');
		parts.push(issue.description);
		parts.push('');
	}

	if (issue.labels.length > 0) {
		parts.push(`**Labels:** ${issue.labels.join(', ')}`);
		parts.push('');
	}

	if (issue.comments.length > 0) {
		parts.push('## Comments');
		for (const comment of issue.comments) {
			parts.push(`> ${comment}`);
			parts.push('');
		}
	}

	if (labelConfig?.extra_prompt) {
		parts.push('## Instructions');
		parts.push(labelConfig.extra_prompt);
		parts.push('');
	}

	parts.push('## Rules');
	parts.push('- Follow existing code patterns and conventions in the codebase.');
	parts.push('- Write clean, maintainable code.');
	parts.push('- Include tests if the project has a test suite.');
	parts.push(`- Commit message format: "feat(${issue.identifier}): <description>"`);

	return {
		prompt: parts.join('\n'),
		model,
		maxBudgetUsd,
		allowedTools
	};
}
