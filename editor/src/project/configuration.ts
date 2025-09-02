import { Observable } from "babylonjs";
import { dirname, join } from "path/posix";

export interface IProjectConfiguration {
	path: string | null;
	compressedTexturesEnabled: boolean;
}

export const projectConfiguration: IProjectConfiguration = {
	path: null,
	compressedTexturesEnabled: false,
};

export const onProjectConfigurationChangedObservable = new Observable<IProjectConfiguration>();

/**
 * Returns the rootUrl for assets for the current project.
 */
export function getProjectAssetsRootUrl() {
	return projectConfiguration.path ? join(dirname(projectConfiguration.path), "/") : null;
}
