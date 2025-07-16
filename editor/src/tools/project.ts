import { ensureDir } from "fs-extra";
import { dirname, join } from "path/posix";

export type ProjectType = {
    /**
     * Defines the base64 encoded preview of the project.
     */
    preview?: string;

    /**
     * Defines the absolute path on the hard drive of the project.
     */
    absolutePath: string;

    /**
     * Defines the date when the project was created or imported in the dashboard.
     */
    createdAt: Date;
    /**
     * Defines the date when the project was updated (aka. saved).
     */
    updatedAt: Date;
};

export const temporaryDirectoryName = ".bjseditor";

export const projectsKey: string = "babylonjs-editor-dashboard-projects";

/**
 * Ensures that the temporary directory exists for the given project.
 * This temporary directory is used to store compiled scripts, compressed textures etc.
 * It is not intended to be pushed to the git repository or packed with the game at the end.
 * @param projectAbsolutePath defines the aboslute path to the project being edited in the editor.
 */
export async function ensureTemporaryDirectoryExists(projectAbsolutePath: string) {
	const directory = dirname(projectAbsolutePath);
	const temporaryDirectory = join(directory, temporaryDirectoryName);

	await ensureDir(temporaryDirectory);

	return temporaryDirectory;
}
