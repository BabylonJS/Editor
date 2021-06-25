import Glob from "glob";
import rimraf from "rimraf";
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

	/**
	 * Removes the given directory recursively.
	 * @param directoryPath defines the absolute path to the directory to remove.
	 */
	public static RemoveDirectory(directoryPath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			rimraf(directoryPath, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
