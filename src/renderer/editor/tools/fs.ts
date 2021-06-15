import Glob from "glob";
import { mkdir, pathExists } from "fs-extra";

export class FSTools {
	/**
	 * Creates the directory at the given absolute path. If the directory already exists, nothing is done.
	 * @param path defines the absolute path to the directory to create.
	 */
	public static async CreateDirectory(path: string): Promise<void> {
		if (await pathExists(path)) {
			return;
		}

		await mkdir(path);
	}

	/**
	 * Flattens the list of files available (recursively) in the given directory path.
	 * @param directoryPath defines the path to the directory to recursively get its files.
	 * @returns the list of all files located (recursively) in the given directory path.
	 */
	public static GetGlobFiles(directoryPath: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			Glob(directoryPath, { }, (err, files) => {
				if (err) {
					return reject(err);
				}

				resolve(files);
			});
		});
	}
}
