import { ProjectType, projectsKey } from "./project";

/**
 * Returns the list of projects that were stored in the local storage in order to display them in the dashboard.
 * Those projects are sorted by the last updated date.
 */
export function tryGetProjectsFromLocalStorage(): ProjectType[] {
	try {
		const data = JSON.parse(localStorage.getItem(projectsKey)! ?? "[]") as ProjectType[];
		data.sort((a, b) => {
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});

		return data;
	} catch (e) {
		return [];
	}
}

/**
 * Adds the project located at the given absolute path to the local storage in order to display them in the dashboard.
 * @param absolutePath defines the absolute path to the project file to add to the local storage.
 */
export function tryAddProjectToLocalStorage(absolutePath: string): void {
	try {
		const projects = tryGetProjectsFromLocalStorage();

		localStorage.setItem(
			projectsKey,
			JSON.stringify(
				projects.concat([
					{
						absolutePath,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				])
			)
		);
	} catch (e) {
		console.error("Failed to import project.");
	}
}

/**
 * Returns wether or not experimental features are enabled in the editor.
 */
export function tryGetExperimentalFeaturesEnabledFromLocalStorage(): boolean {
	try {
		return localStorage.getItem("editor-experimental-features") === "true";
	} catch (e) {
		return false;
	}
}

/**
 * Sets whether or not experimental features are enabled in the local storage.
 * @param enabled defines wether or not experimental features are enabled.
 */
export function trySetExperimentalFeaturesEnabledInLocalStorage(enabled: boolean): void {
	try {
		localStorage.setItem("editor-experimental-features", JSON.stringify(enabled));
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns wether or not the dashboard should be closed when a project is opened.
 */
export function tryGetCloseDashboardOnProjectOpenFromLocalStorage(): boolean {
	try {
		return localStorage.getItem("babylonjs-editor-close-dashboard-on-project-open") === "true";
	} catch (e) {
		return false;
	}
}

/**
 * Sets whether or not the dashboard should be closed when a project is opened.
 * @param enabled defines whether or not the dashboard should be closed when a project is opened.
 */
export function trySetCloseDashboardOnProjectOpenInLocalStorage(enabled: boolean): void {
	try {
		localStorage.setItem("babylonjs-editor-close-dashboard-on-project-open", JSON.stringify(enabled));
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns the terminal path stored in the local storage, or null if it fails to access the local storage or if no terminal path is stored.
 */
export function tryGetTerminalFromLocalStorage(): string | null {
	try {
		return localStorage.getItem("babylonjs-editor-terminal");
	} catch (e) {
		return null;
	}
}

/**
 * Sets the terminal path in the local storage.
 * @param terminalPath defines the terminal path to set in the local storage.
 */
export function trySetTerminalInLocalStorage(terminalPath: string): void {
	try {
		localStorage.setItem("babylonjs-editor-terminal", terminalPath);
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns wether or not the AI assistant panel was left open.
 */
export function tryGetAssistantOpenFromLocalStorage(): boolean {
	try {
		return localStorage.getItem("babylonjs-editor-assistant-open") === "true";
	} catch (e) {
		return false;
	}
}

/**
 * Sets wether or not the AI assistant panel is open in the local storage.
 * @param open defines wether or not the AI assistant panel is open.
 */
export function trySetAssistantOpenInLocalStorage(open: boolean): void {
	try {
		localStorage.setItem("babylonjs-editor-assistant-open", JSON.stringify(open));
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns the size of the AI assistant panel, in percents of the width of the window, or null if none is stored.
 */
export function tryGetAssistantSizeFromLocalStorage(): number | null {
	try {
		const size = parseFloat(localStorage.getItem("babylonjs-editor-assistant-size") ?? "");
		return isFinite(size) && size > 0 && size < 100 ? size : null;
	} catch (e) {
		return null;
	}
}

/**
 * Sets the size of the AI assistant panel in the local storage.
 * @param size defines the size of the AI assistant panel, in percents of the width of the window.
 */
export function trySetAssistantSizeInLocalStorage(size: number): void {
	try {
		localStorage.setItem("babylonjs-editor-assistant-size", size.toString());
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns the path of the Claude Code executable chosen by the user, or null to find it automatically.
 */
export function tryGetClaudeExecutablePathFromLocalStorage(): string | null {
	try {
		return localStorage.getItem("babylonjs-editor-assistant-claude-path") || null;
	} catch (e) {
		return null;
	}
}

/**
 * Sets the path of the Claude Code executable chosen by the user in the local storage.
 * @param path defines the absolute path of the executable, or null to find it automatically.
 */
export function trySetClaudeExecutablePathInLocalStorage(path: string | null): void {
	try {
		if (path) {
			localStorage.setItem("babylonjs-editor-assistant-claude-path", path);
		} else {
			localStorage.removeItem("babylonjs-editor-assistant-claude-path");
		}
	} catch (e) {
		// Catch silently.
	}
}
