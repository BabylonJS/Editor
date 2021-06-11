import { mkdir, pathExists } from "fs-extra"

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
}
