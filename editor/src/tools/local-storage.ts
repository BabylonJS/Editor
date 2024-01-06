import { ProjectType, projectsKey } from "./project";

export function tryGetProjectsFromLocalStorage(): ProjectType[] {
    try {
        return JSON.parse(localStorage.getItem(projectsKey)! ?? "[]");
    } catch (e) {
        return [];
    }
}
