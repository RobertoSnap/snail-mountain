import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
	const { stdout } = await execFileAsync('git', args, { cwd });
	return stdout.trim();
}

export async function createWorktree(
	repoPath: string,
	branchName: string,
	worktreeDir: string
): Promise<string> {
	if (!existsSync(worktreeDir)) {
		mkdirSync(worktreeDir, { recursive: true });
	}

	const worktreePath = `${worktreeDir}/${branchName.replace(/\//g, '-')}`;

	// Fetch latest
	await git(repoPath, 'fetch', 'origin');

	// Create worktree with new branch from origin/main (or base branch)
	await git(repoPath, 'worktree', 'add', '-b', branchName, worktreePath, 'origin/HEAD');

	return worktreePath;
}

export async function removeWorktree(repoPath: string, worktreePath: string): Promise<void> {
	try {
		await git(repoPath, 'worktree', 'remove', worktreePath, '--force');
	} catch (err) {
		console.warn(`Failed to remove worktree ${worktreePath}:`, err);
	}
}

export async function runSetupScript(worktreePath: string, script: string): Promise<void> {
	const scriptPath = `${worktreePath}/${script}`;
	if (!existsSync(scriptPath)) {
		console.warn(`Setup script not found: ${scriptPath}`);
		return;
	}
	await execFileAsync('bash', [scriptPath], { cwd: worktreePath, timeout: 120_000 });
}
