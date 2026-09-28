import { join } from "path";
import { pathExists, readdir } from "fs-extra";

import { compareVersions, findExecutable, getDefaultLocationOptions, IAssistantExecutable, IAssistantExecutableCandidate, IExecutableLocationOptions } from "./executable";

/**
 * Returns the paths where the installers of Claude Code put its executable, in order of preference.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getClaudeInstallationCandidates(options: IExecutableLocationOptions = getDefaultLocationOptions()): string[] {
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
export function getClaudeDesktopAppCodeDirectory(options: IExecutableLocationOptions = getDefaultLocationOptions()): string | null {
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
export function findClaudeExecutable(customPath?: string | null): Promise<IAssistantExecutable | null> {
	return findExecutable({
		command: "claude",
		customPath,
		parseVersion: parseClaudeVersion,
		getCandidates: async () => [
			...getClaudeInstallationCandidates().map((path): IAssistantExecutableCandidate => ({ path, source: "installation" })),
			...(await findClaudeInDesktopApp()).map((path): IAssistantExecutableCandidate => ({ path, source: "desktop-app" })),
		],
	});
}
