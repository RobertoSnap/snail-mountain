import { parse } from 'smol-toml';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface RepoLabelConfig {
	mode?: string;
	model?: string;
	tools?: string[];
	max_budget_usd?: number;
	extra_prompt?: string;
}

export interface RepoConfig {
	path: string;
	base_branch: string;
	worktree_dir: string;
	setup_script?: string;
	linear_team_id: string;
	default_model?: string;
	default_max_budget_usd?: number;
	test_command?: string;
	labels?: Record<string, RepoLabelConfig>;
}

export interface Config {
	account?: {
		linear_agent_user_id?: string;
	};
	server: {
		port: number;
		host: string;
	};
	concurrency: {
		max_parallel: number;
		queue_strategy: string;
	};
	notifications?: {
		slack?: {
			webhook_url: string;
			notify_on: string[];
		};
	};
	repos: Record<string, RepoConfig>;
}

let cachedConfig: Config | null = null;

export function getConfigPath(): string {
	return join(homedir(), '.snailmountain', 'config.toml');
}

export function loadConfig(): Config {
	if (cachedConfig) return cachedConfig;

	const configPath = getConfigPath();
	if (!existsSync(configPath)) {
		throw new Error(`Config file not found: ${configPath}. Run 'snailmountain init' first.`);
	}

	const raw = readFileSync(configPath, 'utf-8');
	const parsed = parse(raw) as unknown as Config;

	// Validate required fields
	if (!parsed.repos || Object.keys(parsed.repos).length === 0) {
		throw new Error('config.toml: at least one repo must be configured');
	}

	for (const [key, repo] of Object.entries(parsed.repos)) {
		if (!repo.path) throw new Error(`config.toml: repos.${key}.path is required`);
		if (!repo.base_branch) throw new Error(`config.toml: repos.${key}.base_branch is required`);
		if (!repo.worktree_dir) throw new Error(`config.toml: repos.${key}.worktree_dir is required`);
		if (!repo.linear_team_id)
			throw new Error(`config.toml: repos.${key}.linear_team_id is required`);
	}

	// Defaults
	parsed.server = {
		port: parsed.server?.port ?? 3456,
		host: parsed.server?.host ?? '127.0.0.1'
	};
	parsed.concurrency = {
		max_parallel: parsed.concurrency?.max_parallel ?? 2,
		queue_strategy: parsed.concurrency?.queue_strategy ?? 'fifo'
	};

	cachedConfig = parsed;
	return parsed;
}

export function findRepoByTeamId(teamId: string): { key: string; config: RepoConfig } | null {
	const config = loadConfig();
	for (const [key, repo] of Object.entries(config.repos)) {
		if (repo.linear_team_id === teamId) {
			return { key, config: repo };
		}
	}
	return null;
}

export function clearConfigCache(): void {
	cachedConfig = null;
}
