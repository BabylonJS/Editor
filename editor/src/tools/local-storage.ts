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
 * Returns the identifier of the agent the user chose to run in the AI assistant, or null if none was chosen yet.
 */
export function tryGetAssistantAgentFromLocalStorage(): string | null {
	try {
		return localStorage.getItem("babylonjs-editor-assistant-agent") || null;
	} catch (e) {
		return null;
	}
}

/**
 * Sets the identifier of the agent the user chose to run in the AI assistant in the local storage.
 * @param agent defines the identifier of the agent, like "claude" or "codex".
 */
export function trySetAssistantAgentInLocalStorage(agent: string): void {
	try {
		localStorage.setItem("babylonjs-editor-assistant-agent", agent);
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns the path of the executable of the given agent chosen by the user, or null to find it automatically.
 * @param agent defines the identifier of the agent, like "claude" or "codex".
 */
export function tryGetAssistantExecutablePathFromLocalStorage(agent: string): string | null {
	try {
		return localStorage.getItem(`babylonjs-editor-assistant-${agent}-path`) || null;
	} catch (e) {
		return null;
	}
}

/**
 * Sets the path of the executable of the given agent chosen by the user in the local storage.
 * @param agent defines the identifier of the agent, like "claude" or "codex".
 * @param path defines the absolute path of the executable, or null to find it automatically.
 */
export function trySetAssistantExecutablePathInLocalStorage(agent: string, path: string | null): void {
	try {
		if (path) {
			localStorage.setItem(`babylonjs-editor-assistant-${agent}-path`, path);
		} else {
			localStorage.removeItem(`babylonjs-editor-assistant-${agent}-path`);
		}
	} catch (e) {
		// Catch silently.
	}
}
