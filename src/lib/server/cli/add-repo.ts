import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigPath } from '$lib/server/config';

async function ask(
	rl: ReturnType<typeof createInterface>,
	question: string,
	defaultValue?: string
): Promise<string> {
	const suffix = defaultValue ? ` [${defaultValue}]` : '';
	const answer = await rl.question(`${question}${suffix}: `);
	return answer.trim() || defaultValue || '';
}

export async function runAddRepo(): Promise<void> {
	const rl = createInterface({ input: stdin, output: stdout });

	try {
		const configPath = getConfigPath();
		if (!existsSync(configPath)) {
			console.error('Config not found. Run snailmountain init first.');
			return;
		}

		console.log('\n🐌 Add Repository\n');

		const repoName = await ask(rl, 'Repo name (e.g., my-frontend)');
		const repoPath = await ask(rl, 'Repo path (absolute)');
		const baseBranch = await ask(rl, 'Base branch', 'main');
		const linearTeamId = await ask(rl, 'Linear team ID');
		const worktreeDir = await ask(rl, 'Worktree directory', `${repoPath}/../worktrees/${repoName}`);
		const setupScript = await ask(rl, 'Setup script (leave empty to skip)');
		const defaultModel = await ask(rl, 'Default model', 'sonnet');
		const defaultBudget = await ask(rl, 'Default max budget (USD)', '5.0');

		if (!repoName || !repoPath || !linearTeamId) {
			console.error('Repo name, path, and Linear team ID are required.');
			return;
		}

		// Verify repo path
		if (!existsSync(join(repoPath, '.git'))) {
			console.warn(`Warning: ${repoPath} does not appear to be a git repository`);
		}

		// Append to config
		const newLines = [
			'',
			`[repos.${repoName}]`,
			`path = "${repoPath}"`,
			`base_branch = "${baseBranch}"`,
			`worktree_dir = "${worktreeDir}"`,
			`linear_team_id = "${linearTeamId}"`,
			`default_model = "${defaultModel}"`,
			`default_max_budget_usd = ${defaultBudget}`
		];

		if (setupScript) {
			newLines.push(`setup_script = "${setupScript}"`);
		}

		newLines.push('');

		const existing = readFileSync(configPath, 'utf-8');
		writeFileSync(configPath, existing + newLines.join('\n'));

		console.log(`\n✓ Repo "${repoName}" added to ${configPath}`);
	} finally {
		rl.close();
	}
}
