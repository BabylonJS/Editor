import { homedir } from "os";
import { execFile } from "child_process";
import { access, constants, pathExists } from "fs-extra";

export type AssistantExecutableSource = "custom" | "path" | "installation" | "desktop-app";

export interface IAssistantExecutable {
	/**
	 * Defines the absolute path of the executable of the agent.
	 */
	path: string;
	/**
	 * Defines where the executable was found.
	 */
	source: AssistantExecutableSource;
	/**
	 * Defines the version of the agent, as reported by "<executable> --version".
	 */
	version: string;
}

export interface IAssistantExecutableCandidate {
	/**
	 * Defines the absolute path the executable may have.
	 */
	path: string;
	/**
	 * Defines where the executable comes from when it is found at this path.
	 */
	source: AssistantExecutableSource;
}

export interface IExecutableLocationOptions {
	platform: NodeJS.Platform;
	home: string;
	env: NodeJS.ProcessEnv;
}

export function getDefaultLocationOptions(): IExecutableLocationOptions {
	return {
		platform: process.platform,
		home: homedir(),
		env: process.env,
	};
}

/**
 * Compares two versions made of numbers separated by dots, like "2.1.283".
 * @returns a negative number when a is older than b, a positive one when it is newer, 0 when they are equal.
 */
export function compareVersions(a: string, b: string): number {
	const partsA = a.split(/[.-]/).map((part) => parseInt(part, 10) || 0);
	const partsB = b.split(/[.-]/).map((part) => parseInt(part, 10) || 0);

	for (let i = 0; i < Math.max(partsA.length, partsB.length); ++i) {
		const difference = (partsA[i] ?? 0) - (partsB[i] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}

	return 0;
}

/**
 * Extracts the absolute path of the executable from the output of "command -v <command>" (macOS, Linux) or "where
 * <command>" (Windows). Interactive shells may print other lines, and an alias prints its command.
 * @param output defines the output of the command.
 * @param platform defines the platform of the user.
 * @param command defines the name of the command that was looked up, like "claude".
 */
export function parseCommandLookupOutput(output: string, platform: NodeJS.Platform, command: string): string | null {
	const lines = output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line);

	if (platform === "win32") {
		const paths = lines.filter((line) => /^[a-z]:\\/i.test(line));
		return paths.find((line) => line.toLowerCase().endsWith(".exe")) ?? paths.find((line) => /\.(cmd|bat)$/i.test(line)) ?? null;
	}

	const pattern = new RegExp(`(\\/[^'"\\s]*${command}[^'"\\s]*)`);

	for (const line of lines.reverse()) {
		const match = line.match(pattern);
		if (match) {
			return match[1].replace(/^~(?=\/)/, homedir());
		}
	}

	return null;
}

export function execFileOutput(file: string, args: string[], timeout: number): Promise<string | null> {
	return new Promise((resolve) => {
		const env = { ...process.env };
		delete env.ELECTRON_RUN_AS_NODE;

		execFile(file, args, { timeout, env, windowsHide: true, shell: /\.(cmd|bat)$/i.test(file) }, (error, stdout) => {
			resolve(error ? null : stdout.toString());
		});
	});
}

/**
 * Returns the version of the given executable, or null when it is not a working executable of the agent.
 * @param path defines the absolute path of the executable.
 * @param parseVersion defines the function extracting the version from the output of "<executable> --version".
 */
export async function getExecutableVersion(path: string, parseVersion: (output: string) => string | null): Promise<string | null> {
	try {
		if (process.platform !== "win32") {
			await access(path, constants.X_OK);
		} else if (!(await pathExists(path))) {
			return null;
		}
	} catch (e) {
		return null;
	}

	const output = await execFileOutput(path, ["--version"], 15000);
	return output ? parseVersion(output) : null;
}

/**
 * Returns the absolute path of the given command in the PATH of the user, or null when it is not found.
 * @param command defines the name of the command, like "claude".
 */
export async function findCommandInPath(command: string): Promise<string | null> {
	if (process.platform === "win32") {
		const output = await execFileOutput("where.exe", [command], 5000);
		return output ? parseCommandLookupOutput(output, "win32", command) : null;
	}

	// An application started from the Finder doesn't get the PATH of the user: ask an interactive login shell, which
	// reads the same configuration files as the terminal of the user.
	const shell = process.env.SHELL || "/bin/zsh";
	const output = await execFileOutput(shell, ["-ilc", `command -v ${command}`], 8000);

	return output ? parseCommandLookupOutput(output, process.platform, command) : null;
}

export interface IFindExecutableOptions {
	/**
	 * Defines the name of the command of the agent, looked up in the PATH of the user.
	 */
	command: string;
	/**
	 * Defines the path of the executable chosen by the user, if any.
	 */
	customPath?: string | null;
	/**
	 * Defines the function extracting the version from the output of "<executable> --version".
	 */
	parseVersion: (output: string) => string | null;
	/**
	 * Defines the function returning the other paths the executable may have, in order of preference.
	 */
	getCandidates: () => Promise<IAssistantExecutableCandidate[]>;
}

/**
 * Finds the executable of an agent installed on this computer: the one chosen by the user, the one in the PATH of the
 * user, then the given candidates.
 * @returns the first executable that answers "<executable> --version", or null when none is found.
 */
export async function findExecutable(options: IFindExecutableOptions): Promise<IAssistantExecutable | null> {
	const tried = new Set<string>();

	const tryCandidate = async (path: string | null, source: AssistantExecutableSource): Promise<IAssistantExecutable | null> => {
		if (!path || tried.has(path)) {
			return null;
		}

		tried.add(path);

		const version = await getExecutableVersion(path, options.parseVersion);
		return version ? { path, source, version } : null;
	};

	if (options.customPath) {
		// A path chosen by the user is never silently replaced by another executable.
		return tryCandidate(options.customPath, "custom");
	}

	const fromPath = await tryCandidate(await findCommandInPath(options.command), "path");
	if (fromPath) {
		return fromPath;
	}

	for (const candidate of await options.getCandidates()) {
		const result = await tryCandidate(candidate.path, candidate.source);
		if (result) {
			return result;
		}
	}

	return null;
}
