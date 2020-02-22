import { basename } from "path";

import { Nullable, IStringDictionary } from "../../../shared/types";

export interface IFile {
    /**
     * The name of the file in file system.
     */
    name: string;
    /**
     * The absolute path of the file in the file system.
     */
    path: string;
}

export interface IContentFile extends IFile {
    /**
     * Defines the content of the file.
     */
    content: string;
}

export class FilesStore {
    /**
     * Defines the list of all available files in the project.
     */
    public static List: IStringDictionary<IFile> = { };
    /**
     * Reference to the project's file.
     */
    public static Project: Nullable<IFile> = null;

    /**
     * Clears the current file list of the project.
     */
    public static Clear(): void {
        this.List = { };
        this.Project = null;
    }

    /**
     * Returns the number of files available in the project.
     */
    public static GetFilesCount(): number {
        return Object.keys(this.List).length;
    }

    /**
     * Adds a new file to the files list according to the given file absolute path.
     */
    public static AddFile(absolutePath: string): void {
        this.List[absolutePath] = {
            path: absolutePath,
            name: basename(absolutePath),
        };
    }

    /**
     * Removes the file from the list, located at the given path.
     * @param path the path of the file to remove from the list.
     */
    public static RemoveFileFromPath(path: string): void {
        for (const f in this.List) {
            const file = this.List[f];
            if (file.path === path) {
                delete this.List[f];
                return;
            }
        }
    }

    /**
     * Returns the first file found which has the given path.
     * @param path the path of the file to find.
     */
    public static GetFileFromPath(path: string): Nullable<IFile> {
        for (const f in this.List) {
            const file = this.List[f];
            if (file.path === path) { return this.List[f]; }
		}

		return null;
	}

	/**
	 * Returns the key in the .list dictionary of the file located at the given path.
	 * @param path the path of the file to find its key.
	 */
	public static GetKeyFromPath(path: string): Nullable<string> {
		for (const f in this.List) {
            const file = this.List[f];
            if (file.path === path) { return f; }
		}

		return null;
	}

    /**
     * Returns the first file found which has the given base name.
     * @param name the name of the file to find.
     */
    public static GetFileFromBaseName(name: string): Nullable<IFile> {
        for (const f in this.List) {
            const file = this.List[f];
            if (basename(file.name) === name) { return this.List[f]; }
        }

        return null;
    }
}
