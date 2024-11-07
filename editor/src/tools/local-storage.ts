import { ProjectType, projectsKey } from "./project";

/**
 * Returns the list of projects that were stored in the local storage in order to display them in the dashboard.
 * Those proejcts are sorted by the last updated date.
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
