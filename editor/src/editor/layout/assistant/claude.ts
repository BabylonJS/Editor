import { join } from "path";
import { homedir } from "os";
import { execFile } from "child_process";
import { access, constants, pathExists, readdir } from "fs-extra";

export type ClaudeExecutableSource = "custom" | "path" | "installation" | "desktop-app";

export interface IClaudeExecutable {
	/**
	 * Defines the absolute path of the Claude Code executable.
	 */
	path: string;
	/**
	 * Defines where the executable was found.
	 */
	source: ClaudeExecutableSource;
	/**
	 * Defines the version of Claude Code, as reported by "claude --version".
	 */
	version: string;
}

export interface IClaudeLocationOptions {
	platform: NodeJS.Platform;
	home: string;
	env: NodeJS.ProcessEnv;
}

function getDefaultLocationOptions(): IClaudeLocationOptions {
	return {
		platform: process.platform,
		home: homedir(),
		env: process.env,
	};
}

/**
 * Returns the paths where the installers of Claude Code put its executable, in order of preference.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getClaudeInstallationCandidates(options: IClaudeLocationOptions = getDefaultLocationOptions()): string[] {
	if (options.platform === "win32") {
		const candidates = [join(options.home, ".local", "bin", "claude.exe")];
		if (options.env.APPDATA) {
			candidates.push(join(options.env.APPDATA, "npm", "claude.cmd"));
		}

		return candidates;
	}

	return [
		join(options.home, ".local", "bin", "claude"),
		join(options.home, ".claude", "local", "claude"),
		"/opt/homebrew/bin/claude",
		"/usr/local/bin/claude",
		join(options.home, ".npm-global", "bin", "claude"),
		join(options.home, ".bun", "bin", "claude"),
	];
}

/**
 * Returns the folder where the Claude desktop app keeps the versions of Claude Code it downloaded, or null when the
 * platform has no desktop app.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getClaudeDesktopAppCodeDirectory(options: IClaudeLocationOptions = getDefaultLocationOptions()): string | null {
	switch (options.platform) {
		case "darwin":
			return join(options.home, "Library", "Application Support", "Claude", "claude-code");
		case "win32":
			return options.env.APPDATA ? join(options.env.APPDATA, "Claude", "claude-code") : null;
		default:
			return null;
	}
}

/**
 * Returns the paths the executable of Claude Code can have in a version folder of the Claude desktop app.
 * @param versionDirectory defines the absolute path of the folder of the version.
 * @param platform defines the platform of the user.
 */
export function getClaudeDesktopAppExecutableCandidates(versionDirectory: string, platform: NodeJS.Platform): string[] {
	if (platform === "win32") {
		return [join(versionDirectory, "claude.exe"), join(versionDirectory, "bin", "claude.exe")];
	}

	return [join(versionDirectory, "claude.app", "Contents", "MacOS", "claude"), join(versionDirectory, "claude")];
}

/**
 * Extracts the version of Claude Code from the output of "claude --version", e.g. "2.1.283 (Claude Code)".
 * @param output defines the output of the command.
 */
export function parseClaudeVersion(output: string): string | null {
	if (!/claude code/i.test(output)) {
		return null;
	}

	return output.match(/(\d+\.\d+\.\d+[\w.-]*)/)?.[1] ?? null;
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
 * Extracts the absolute path of the executable from the output of "command -v claude" (macOS, Linux) or "where
 * claude" (Windows). Interactive shells may print other lines, and an alias prints its command.
 * @param output defines the output of the command.
 * @param platform defines the platform of the user.
 */
export function parseCommandLookupOutput(output: string, platform: NodeJS.Platform): string | null {
	const lines = output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line);

	if (platform === "win32") {
		const paths = lines.filter((line) => /^[a-z]:\\/i.test(line));
		return paths.find((line) => line.toLowerCase().endsWith(".exe")) ?? paths.find((line) => /\.(cmd|bat)$/i.test(line)) ?? null;
	}

	for (const line of lines.reverse()) {
		const match = line.match(/(\/[^'"\s]*claude[^'"\s]*)/);
		if (match) {
			return match[1].replace(/^~(?=\/)/, homedir());
		}
	}

	return null;
}

function execFileOutput(file: string, args: string[], timeout: number): Promise<string | null> {
	return new Promise((resolve) => {
		const env = { ...process.env };
		delete env.ELECTRON_RUN_AS_NODE;

		execFile(file, args, { timeout, env, windowsHide: true, shell: /\.(cmd|bat)$/i.test(file) }, (error, stdout) => {
			resolve(error ? null : stdout.toString());
		});
	});
}

/**
 * Returns the version of the given Claude Code executable, or null when it is not a working Claude Code executable.
 * @param path defines the absolute path of the executable.
 */
export async function getClaudeVersion(path: string): Promise<string | null> {
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
	return output ? parseClaudeVersion(output) : null;
}

async function findClaudeInPath(): Promise<string | null> {
	if (process.platform === "win32") {
		const output = await execFileOutput("where.exe", ["claude"], 5000);
		return output ? parseCommandLookupOutput(output, "win32") : null;
	}

	// An application started from the Finder doesn't get the PATH of the user: ask an interactive login shell, which
	// reads the same configuration files as the terminal of the user.
	const shell = process.env.SHELL || "/bin/zsh";
	const output = await execFileOutput(shell, ["-ilc", "command -v claude"], 8000);

	return output ? parseCommandLookupOutput(output, process.platform) : null;
}

async function findClaudeInDesktopApp(): Promise<string[]> {
	const directory = getClaudeDesktopAppCodeDirectory();
	if (!directory || !(await pathExists(directory))) {
		return [];
	}

	const versions = (await readdir(directory)).filter((name) => /^\d+\.\d+\.\d+/.test(name)).sort((a, b) => compareVersions(b, a));

	return versions.flatMap((version) => getClaudeDesktopAppExecutableCandidates(join(directory, version), process.platform));
}

/**
 * Finds the Claude Code executable installed on this computer: the one chosen by the user, the one in the PATH of the
 * user, the ones the installers of Claude Code create, and finally the one downloaded by the Claude desktop app.
 * @param customPath defines the path of the executable chosen by the user, if any.
 * @returns the first executable that answers "claude --version", or null when none is found.
 */
export async function findClaudeExecutable(customPath?: string | null): Promise<IClaudeExecutable | null> {
	const tried = new Set<string>();

	const tryCandidate = async (path: string | null, source: ClaudeExecutableSource): Promise<IClaudeExecutable | null> => {
		if (!path || tried.has(path)) {
			return null;
		}

		tried.add(path);

		const version = await getClaudeVersion(path);
		return version ? { path, source, version } : null;
	};

	if (customPath) {
		// A path chosen by the user is never silently replaced by another executable.
		return tryCandidate(customPath, "custom");
	}

	const fromPath = await tryCandidate(await findClaudeInPath(), "path");
	if (fromPath) {
		return fromPath;
	}

	for (const candidate of getClaudeInstallationCandidates()) {
		const result = await tryCandidate(candidate, "installation");
		if (result) {
			return result;
		}
	}

	for (const candidate of await findClaudeInDesktopApp()) {
		const result = await tryCandidate(candidate, "desktop-app");
		if (result) {
			return result;
		}
	}

	return null;
}
