import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runAgent, type AgentResult } from '$lib/server/integrations/claude';

const execFileAsync = promisify(execFile);

const MAX_VERIFY_ATTEMPTS = 3;

export interface VerifyOptions {
	worktreePath: string;
	testCommand?: string;
	model: string;
	maxBudgetUsd: number;
	allowedTools?: string[];
}

export interface VerifyResult {
	passed: boolean;
	attempts: number;
	totalCostUsd: number;
	lastError?: string;
}

export async function verifyAndFix(options: VerifyOptions): Promise<VerifyResult> {
	const testCommand = options.testCommand;
	if (!testCommand) {
		return { passed: true, attempts: 0, totalCostUsd: 0 };
	}

	let totalCostUsd = 0;

	for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
		const testResult = await runTests(options.worktreePath, testCommand);

		if (testResult.success) {
			return { passed: true, attempts: attempt, totalCostUsd };
		}

		// Last attempt — don't try to fix
		if (attempt === MAX_VERIFY_ATTEMPTS) {
			return {
				passed: false,
				attempts: attempt,
				totalCostUsd,
				lastError: testResult.output
			};
		}

		// Ask agent to fix the test failures
		const fixPrompt = [
			'The tests are failing. Here is the test output:',
			'',
			'```',
			testResult.output.slice(0, 5000),
			'```',
			'',
			'Fix the code so the tests pass. Do not modify the tests unless they are clearly wrong.'
		].join('\n');

		const fixResult: AgentResult = await runAgent({
			prompt: fixPrompt,
			cwd: options.worktreePath,
			model: options.model,
			maxBudgetUsd: Math.min(options.maxBudgetUsd * 0.3, 2.0),
			allowedTools: options.allowedTools
		});

		totalCostUsd += fixResult.costUsd ?? 0;

		if (!fixResult.success) {
			return {
				passed: false,
				attempts: attempt,
				totalCostUsd,
				lastError: 'Agent exceeded budget while fixing tests'
			};
		}
	}

	return { passed: false, attempts: MAX_VERIFY_ATTEMPTS, totalCostUsd };
}

async function runTests(
	cwd: string,
	command: string
): Promise<{ success: boolean; output: string }> {
	const [cmd, ...args] = command.split(' ');
	try {
		const { stdout, stderr } = await execFileAsync(cmd, args, {
			cwd,
			timeout: 120_000,
			env: { ...process.env, CI: 'true' }
		});
		return { success: true, output: stdout + stderr };
	} catch (err) {
		const execErr = err as { stdout?: string; stderr?: string; message?: string };
		return {
			success: false,
			output: (execErr.stdout ?? '') + (execErr.stderr ?? '') + (execErr.message ?? '')
		};
	}
}
