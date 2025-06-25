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

		localStorage.setItem(projectsKey, JSON.stringify(projects.concat([{
			absolutePath,
			createdAt: new Date(),
			updatedAt: new Date(),
		}])));
	} catch (e) {
		alert("Failed to import project.");
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
 * Sets wether or not experimental features are enabled in the local storage.
 * @param enabled defines wether or not experimental features are enabled.
 */
export function trySetExperimentalFeaturesEnabledInLocalStorage(enabled: boolean): void {
	try {
		localStorage.setItem("editor-experimental-features", JSON.stringify(enabled));
	} catch (e) {
		// Catch silently.
	}
}
