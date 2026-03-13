import { runInit } from './init';
import { runAddRepo } from './add-repo';
import { runStatus } from './status';

const commands: Record<string, () => void | Promise<void>> = {
	init: runInit,
	'add-repo': runAddRepo,
	status: runStatus
};

export async function runCli(args: string[]): Promise<void> {
	const command = args[0];

	if (!command || command === '--help' || command === '-h') {
		console.log('Usage: snailmountain <command>');
		console.log('');
		console.log('Commands:');
		console.log('  init       Set up SnailMountain configuration');
		console.log('  add-repo   Add a new repository');
		console.log('  status     Show current session status');
		return;
	}

	const handler = commands[command];
	if (!handler) {
		console.error(`Unknown command: ${command}`);
		console.error('Run with --help for usage');
		process.exit(1);
	}

	await handler();
}
