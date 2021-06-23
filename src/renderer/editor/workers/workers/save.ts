import "../../../module";

import { writeFile, writeJSON } from "fs-extra";

export default class SaveWorker {
	/**
	 * Constructor.
	 */
	public constructor() {
		// Nothing to do for now...
	}

	/**
	 * Writes the given JSON in the given destination file.
	 * @param dest defines the destination file to write the Json content.
	 * @param json defines the Json object to write.
	 */
	public async writeFile(dest: string, json: any): Promise<void> {
		await writeFile(dest, JSON.stringify(json, null, "\t"), {
			encoding: "utf-8",
		});
	}

	/**
	 * Writes the given JSON in the given destination file.
	 * @param dest defines the destination file to write the Json content.
	 * @param json defines the Json object to write.
	 */
	public async writeJSON(dest: string, json: any): Promise<void> {
		await writeJSON(dest, json, {
			spaces: "\t",
			encoding: "utf-8",
		});
	}
}
