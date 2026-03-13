import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
	const { stdout } = await execFileAsync('git', args, { cwd });
	return stdout.trim();
}

async function gh(cwd: string, ...args: string[]): Promise<string> {
	const { stdout } = await execFileAsync('gh', args, { cwd });
	return stdout.trim();
}

export async function commitAndPush(
	worktreePath: string,
	branchName: string,
	commitMessage: string
): Promise<void> {
	await git(worktreePath, 'add', '-A');

	// Check if there are changes to commit
	try {
		await git(worktreePath, 'diff', '--cached', '--quiet');
		// No changes — nothing to commit
		return;
	} catch {
		// There are staged changes — proceed
	}

	await git(worktreePath, 'commit', '-m', commitMessage);
	await git(worktreePath, 'push', '-u', 'origin', branchName);
}

export async function createPullRequest(
	worktreePath: string,
	title: string,
	body: string,
	baseBranch: string
): Promise<string> {
	const prUrl = await gh(
		worktreePath,
		'pr',
		'create',
		'--title',
		title,
		'--body',
		body,
		'--base',
		baseBranch,
		'--label',
		'agent-generated'
	);
	return prUrl;
}
