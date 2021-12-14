import { join } from "path";
import { writeFile } from "fs-extra";
import { DirectoryTree } from "directory-tree";

import { Nullable } from "../../../../shared/types";

import { Observable } from "babylonjs";

import PackerWorker from "../../workers/workers/packer";
import { IWorkerConfiguration, Workers } from "../../workers/workers";

import { FSTools } from "../../tools/fs";

import { SceneExporter } from "../scene-exporter";

import { Editor } from "../../editor";

import { WorkSpace } from "../workspace";

export interface IPackerOptions {
	/**
	 * Defines the list of all absolute paths to files to pack.
	 */
	files: string[];
	/**
	 * Defines wether or not the build process should be skipped.
	 */
	skipBuild?: boolean;
}

export enum PackerStatus {
	/**
	 * Defines the status where the project is being built.
	 */
	Building = 0,
	/**
	 * Defines the status where the zip file is being populated.
	 */
	Packing,
	/**
	 * Defines the status where the zip file buffer is being generated.
	 */
	GeneratingBuffer,
	/**
	 * Defines the status where the packer has finished.
	 */
	Done,
	/**
	 * Defines the statis wehre the packer raised an error.
	 */
	Error,
}

export class Packer {
	/**
	 * Defines the observable used to notify observers that a package buffer has been generated.
	 * This buffer can be used by plugins to upload the buffer itself on a webserver and so on.
	 */
	public static OnGeneratedPackageBuffer: Observable<Buffer> = new Observable<Buffer>();

	private static _Worker: Nullable<IWorkerConfiguration> = null;

	/**
	 * Defines the observable used to nofity observers that a new entry has been added to the archive.
	 */
	public onAddEntry: Observable<string> = new Observable<string>();
	/**
	 * Defines the observable used to notify observers that the packer status changed.
	 */
	public onStatusChange: Observable<PackerStatus> = new Observable<PackerStatus>();

	private _editor: Editor;

	/**
	 * Constructor.
	 * @param editor defines the reference to the editor.
	 */
	public constructor(editor: Editor) {
		this._editor = editor;
	}

	/**
	 * Returns the list of all root directory trees from the given files list to pack.
	 * @param files defines the list of all files to pack.
	 */
	public getRootDirectories(files: string[]): DirectoryTree[] {
		const rootDirectories: string[] = [];

		files.forEach((f) => {
			f = f.replace(join(WorkSpace.DirPath!, "/"), "");

			const rootDirectory = f.split("/")[0];
			if (rootDirectory && rootDirectories.indexOf(rootDirectory) === -1) {
				rootDirectories.push(rootDirectory);
			}
		});

		return rootDirectories.map((rd) => {
			return FSTools.GetDirectoryTree(join(WorkSpace.DirPath!, rd));
		});
	}

	/**
	 * Builds the project.
	 */
	public async build(): Promise<void> {
		this.onStatusChange.notifyObservers(PackerStatus.Building);
		this._editor.console.logInfo("[PACKER]: Building dist files");

		await WorkSpace.BuildProject(this._editor);
		await SceneExporter.ExportFinalScene(this._editor);
	}

	/**
	 * Packs the project.
	 * @param options defines the options of the packer.
	 */
	public async pack(options: IPackerOptions): Promise<Nullable<Buffer>> {
		if (!WorkSpace.DirPath) {
			return null;
		}

		// Init worker
		Packer._Worker = Packer._Worker ?? await Workers.LoadWorker("packer.js");
		await Workers.ExecuteFunction<PackerWorker, "init">(Packer._Worker!, "init");

		// Build project
		if (!options.skipBuild) {
			this.onStatusChange.notifyObservers(PackerStatus.Building);
			this._editor.console.logInfo("[PACKER]: Building dist files");

			await WorkSpace.BuildProject(this._editor);
			await SceneExporter.ExportFinalScene(this._editor);
		}

		// Pack files
		this._editor.console.logInfo("[PACKER]: Packing files");
		this.onStatusChange.notifyObservers(PackerStatus.Packing);

		const rootDirectories = this.getRootDirectories(options.files);

		await Promise.all(rootDirectories.map((rd) => this._recursivelyPack(rd, options.files)));

		// Get buffer and reset
		this._editor.console.logInfo("[PACKER]: Generating buffer");
		this.onStatusChange.notifyObservers(PackerStatus.GeneratingBuffer);

		const buffer = await Workers.ExecuteFunction<PackerWorker, "getZipBuffer">(Packer._Worker!, "getZipBuffer");
		await Workers.ExecuteFunction<PackerWorker, "reset">(Packer._Worker!, "reset");

		if (buffer) {
			Packer.OnGeneratedPackageBuffer.notifyObservers(buffer);
		}

		return buffer;
	}

	/**
	 * Packs and writes the zip file to the given destination file.
	 * @param destination defines the destination file where to write the zip file.
	 * @param options defines the options of the packer.
	 */
	public async packToFile(destination: string, options: IPackerOptions): Promise<void> {
		const buffer = await this.pack(options);
		if (!buffer) { return; }

		this.onStatusChange.notifyObservers(PackerStatus.Done);
		this._editor.console.logInfo(`[PACKER]: Writing file to ${destination}`);

		await writeFile(destination, buffer);
	}

	/**
	 * Recursively adds the given root directory to the zip
	 */
	private async _recursivelyPack(rootDirectory: DirectoryTree, files: string[]): Promise<void> {
		if (!files?.find((f) => f.indexOf(rootDirectory.path) !== -1)) {
			return;
		}

		const path = rootDirectory.path.replace(join(WorkSpace.DirPath!, "/"), "");
		const entryName = rootDirectory.type === "directory" ? join(path, "/") : path;

		this.onAddEntry.notifyObservers(entryName);

		// Call worker
		if (rootDirectory.type === "directory") {
			await Workers.ExecuteFunction<PackerWorker, "addDirectory">(Packer._Worker!, "addDirectory", entryName);
		} else {
			await Workers.ExecuteFunction<PackerWorker, "addFile">(Packer._Worker!, "addFile", entryName, rootDirectory.path);
		}

		// Continue
		for (const c of (rootDirectory.children ?? [])) {
			await this._recursivelyPack(c, files);
		}
	}
}
