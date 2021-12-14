import "../../../module";

import Zip from "adm-zip";
import { readFile, writeFile } from "fs-extra";

import { Nullable } from "../../../../shared/types";

export default class PackerWorker {
	private _zip: Nullable<Zip> = null;

	/**
	 * Constructor.
	 */
	public constructor() {
		// Nothing to do for now...
	}

	public init(): void {
		this._zip = new Zip();
	}

	/**
	 * Resets the packer worker.
	 */
	public reset(): void {
		this._zip = null;
	}

	/**
	 * Adds the given directory to the zip archive.
	 * @param entryName defines the name of the entry in the zip file (aka the name of the folder).
	 */
	public addDirectory(entryName: string): void {
		this._zip?.addFile(entryName, Buffer.from("null"));
	}

	/**
	 * Adds the given file to the zip archive.
	 * @param entryName defines the name of the entry in the zip file (aka the name of the file).
	 * @param dataPath defines the absolute path to the file data to add in the zip file.
	 */
	public async addFile(entryName: string, dataPath: string): Promise<void> {
		this._zip?.addFile(entryName, await readFile(dataPath));
	}

	/**
	 * Returns the reference to the generated zip file buffer.
	 */
	public getZipBuffer(): Nullable<Buffer> {
		return this._zip?.toBuffer() ?? null;
	}

	/**
	 * Writes the current zip archive to the given file path.
	 * @param destinationPath defines the absolute path where to write the zip file.
	 */
	public async writeZipFile(destinationPath: string): Promise<void> {
		if (!this._zip) { return; }

		const zipBuffer = this._zip.toBuffer();
		await writeFile(destinationPath, zipBuffer);
	}
}
