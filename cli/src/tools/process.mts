import { exec } from "node:child_process";

import chalk from "chalk";

/**
 * Executes the given command asynchronously using `child_process`
 * @param command defines the command to execute.
 */
export function executeAsync(command: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(chalk.red(command), chalk.red(stderr));
				reject(error);
			} else {
				console.log(chalk.gray(command), chalk.gray(stdout));
				resolve();
			}
		});
	});
}
