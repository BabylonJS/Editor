import filenamify from "filenamify";
import { DirectoryTree } from "directory-tree";
import { basename, dirname, extname, join } from "path";
import { copyFile, pathExists, readdir, readFile, readJSON, remove, writeFile, writeJSON } from "fs-extra";

import { Nullable } from "../../../shared/types";

import { LGraph } from "litegraph.js";
import { SceneSerializer, Mesh, Bone } from "babylonjs";

import { AdvancedDynamicTexture } from "babylonjs-gui";

import { Editor } from "../editor";

import { FSTools } from "../tools/fs";
import { Tools } from "../tools/tools";
import { AppTools } from "../tools/app";
import { KTXTools, KTXToolsType } from "../tools/ktx";
import { MaterialTools } from "../tools/components/material";

import { SceneSettings } from "../scene/settings";
import { SceneExportOptimzer } from "../scene/export-optimizer";

import { Project } from "./project";
import { WorkSpace } from "./workspace";

import { GraphCode } from "../graph/graph";
import { GraphCodeGenerator } from "../graph/generate";

import { GeometryExporter } from "../export/geometry";

import DirectoryWorker from "../workers/workers/directory";
import { IWorkerConfiguration, Workers } from "../workers/workers";

export interface IExportFinalSceneOptions {
	/**
	 * defines the optional path where to save to final scene.
	 */
	destPath?: string;
	/**
	 * Defines the root path applied on geometries in .babylon file in case of incremental loading.
	 */
	geometryRootPath?: string;

	/**
	 * Defines wether or not files are forced to be re-generated.
	 */
	forceRegenerateFiles?: boolean;
	/**
	 * Defines wether or not all compressed textures should be regenerated.
	 */
	forceRegenerateCompressedTextures?: boolean;
	/**
	 * Defines wether or not all compressed texture formats should be generated.
	 * Typically used when exporting final scene version.
	 */
	generateAllCompressedTextureFormats?: boolean;
}

export class SceneExporter {
	/**
	 * Defines the list of all textures file types that are copy-able for the
	 * final assets output folder.
	 */
	public static readonly CopyAbleImageTypes: string[] = [
		".png", ".jpeg", ".jpg", ".bmp",
	];

	/**
	 * Defines the list of all video file types that are copy-able for the
	 * final assets output folder.
	 */
	public static readonly CopyAbleVideoTypes: string[] = [
		".webm", ".mp4",
	];

	/**
	 * Defines the list of all 3d assets file types that are copy-able for the
	 * final assets output folder.
	 */
	public static readonly CopyAble3dAssetTypes: string[] = [
		".glb", ".gltf",
	];

	/**
	 * Defines the list of all file types that are copy-able for the
	 * final assets output folder.
	 */
	public static readonly CopyAbleAssetsTypes: string[] = [
		...SceneExporter.CopyAbleImageTypes,
		...SceneExporter.CopyAbleVideoTypes,
		...SceneExporter.CopyAble3dAssetTypes,
		".env", ".dds",
		".mp3", ".wav", ".ogg", ".wave",
		".gui",
		".json",
	];

	private static _IsExporting: boolean = false;
	private static _Worker: Nullable<IWorkerConfiguration> = null;

	/**
	 * Exports the final scene and asks for the destination folder.
	 * @param editor defines the reference to the editor.
	 */
	public static async ExportFinalSceneAs(editor: Editor): Promise<void> {
		const destPath = await AppTools.ShowSaveDialog();
		if (!destPath) { return; }

		return this.ExportFinalScene(editor, undefined, { destPath });
	}

	/**
	 * Eports the final scene.
	 * @param editor the editor reference.
	 * @param task defines the already existing task feedback to reuse.
	 * @param destPath defines the optional path where to save to final scene.
	 */
	public static async ExportFinalScene(editor: Editor, task?: string, options?: IExportFinalSceneOptions): Promise<void> {
		if (this._IsExporting) {
			return;
		}

		this._IsExporting = true;

		try {
			await this._ExportFinalScene(editor, task, options);
		} catch (e) {
			console.error(e);
			editor.console.logError(e.message);
		}

		this._IsExporting = false;
	}

	/**
	 * Exports the current scene into .babylon format including only geometries.
	 * @param editor defines the reference to the editor.
	 */
	public static async ExportFinalSceneOnlyGeometries(editor: Editor): Promise<void> {
		// Generate scene
		const scene = SceneExporter.GetFinalSceneJson(editor);
		if (!scene) { return; }

		scene.materials = [];
		scene.lights = [];
		scene.cameras = [];
		scene.shadowGenerators = [];
		scene.particleSystems = [];
		scene.meshes?.forEach((m) => m.materialId = null);

		// Save
		let destPath = await AppTools.ShowSaveFileDialog("Save Scene (Only Geometries)");
		if (!destPath) { return; }

		if (extname(destPath).toLowerCase() !== ".babylon") {
			destPath += ".babylon";
		}

		await writeFile(destPath, JSON.stringify(scene), { encoding: "utf-8" });
	}

	/**
	 * Returns the final scene in its JSON representation.
	 * @param editor defines the reference to the editor.
	 */
	public static GetFinalSceneJson(editor: Editor): any {
		// Sounds
		if (editor.scene!.soundTracks?.indexOf(editor.scene!.mainSoundTrack) === -1) {
			editor.scene!.soundTracks.push(editor.scene!.mainSoundTrack);
		}

		// Optimize
		const optimizer = new SceneExportOptimzer(editor.scene!);
		optimizer.optimize();

		// Configure nodes that are not serializable.
		Tools.getAllSceneNodes(editor.scene!).forEach((n) => {
			if (n.metadata?.doNotExport === true) {
				n.doNotSerialize = true;
			}
		});

		const scene = SceneSerializer.Serialize(editor.scene!);
		scene.metadata = scene.metadata ?? {};
		scene.metadata.postProcesses = {
			ssao: { enabled: SceneSettings.IsSSAOEnabled(), json: SceneSettings.SSAOPipeline?.serialize() },
			screenSpaceReflections: { enabled: SceneSettings.IsScreenSpaceReflectionsEnabled(), json: SceneSettings.ScreenSpaceReflectionsPostProcess?.serialize() },
			default: { enabled: SceneSettings.IsDefaultPipelineEnabled(), json: SceneSettings.SerializeDefaultPipeline() },
			motionBlur: { enabled: SceneSettings.IsMotionBlurEnabled(), json: SceneSettings.MotionBlurPostProcess?.serialize() },
		};


		// Animation Groups
		scene.animationGroups ??= [];

		for (let i = scene.animationGroups.length - 1; i >= 0; i--) {
			const g = scene.animationGroups[i];
			if (g.metadata?.doNotSerialize) {
				scene.animationGroups.splice(i, 1);
			}
		}

		Project.Cinematics.forEach((c) => {
			const group = c.generateAnimationGroup(editor.scene!);
			scene.animationGroups.push(group.serialize());
			group.dispose();
		});

		// Post-processes
		scene.postProcesses = [];

		// Set producer
		scene.producer = {
			file: "scene.babylon",
			name: "Babylon.JS Editor",
			version: `v${editor._packageJson.version}`,
			exporter_version: `v${editor._packageJson.dependencies.babylonjs}`,
		};

		// Active camera
		scene.activeCameraID = scene.cameras[0]?.id;

		// LODs
		scene.meshes?.forEach((m) => {
			if (!m) { return; }

			delete m.renderOverlay;
			delete m.materialUniqueId;

			const exportedMeshMetadata = m.metadata;

			// Waiting updated references metadata
			const waitingUpdatedReferences = exportedMeshMetadata?._waitingUpdatedReferences;
			if (waitingUpdatedReferences) {
				delete m.metadata._waitingUpdatedReferences;
				m.metadata = Tools.CloneObject(m.metadata);
				exportedMeshMetadata._waitingUpdatedReferences = waitingUpdatedReferences;
			}

			// Clone metadata.
			try {
				m.metadata = Tools.CloneObject(m.metadata);
			} catch (e) {
				// Catch silently.
			}

			// Heightmap metadata
			if (m.metadata?.heightMap) {
				delete m.metadata.heightMap;
			}

			const mesh = editor.scene!.getMeshById(m.id);
			if (!mesh || !(mesh instanceof Mesh)) { return; }

			const lods = mesh.getLODLevels();
			if (!lods.length) { return; }

			m.lodMeshIds = lods.map((lod) => lod.mesh?.id);
			m.lodDistances = lods.map((lod) => lod.distanceOrScreenCoverage);
			m.lodCoverages = lods.map((lod) => lod.distanceOrScreenCoverage);
		});

		// Bones parenting
		scene.meshes?.forEach((m) => {
			const mesh = editor.scene!.getMeshById(m.id);
			if (mesh && mesh.parent && mesh.parent instanceof Bone) {
				m.metadata ??= {};
				m.metadata.parentBoneId = mesh.parent.id;
			}
		});

		scene.transformNodes?.forEach((tn) => {
			const transformNode = editor.scene!.getTransformNodeById(tn.id);
			if (transformNode && transformNode.parent && transformNode.parent instanceof Bone) {
				tn.metadata ??= {};
				tn.metadata.parentBoneId = transformNode.parent.id;
			}
		});

		// Physics
		scene.physicsEnabled = Project.Project?.physicsEnabled ?? true;
		if (scene.physicsEngine && WorkSpace.Workspace?.physicsEngine) {
			scene.physicsEngine = WorkSpace.Workspace?.physicsEngine;
		}

		scene.meshes?.forEach((m) => {
			const existingMesh = editor.scene!.getMeshById(m.id);
			if (!existingMesh) { return; }

			if (scene.physicsEnabled) {
				if (existingMesh.physicsImpostor) {
					m.physicsRestitution = existingMesh.physicsImpostor.getParam("restitution");
				}
			} else {
				delete m.physicsImpostor;
				delete m.physicsMass;
				delete m.physicsFriction;
				delete m.physicsRestitution;
			}

			m.instances?.forEach((i) => {
				const instance = existingMesh._scene.getMeshById(i.id);
				if (!instance?.physicsImpostor) { return; }

				if (scene.physicsEnabled) {
					i.physicsRestitution = instance.physicsImpostor.getParam("restitution");
				} else {
					delete i.physicsImpostor;
					delete i.physicsMass;
					delete i.physicsFriction;
					delete i.physicsRestitution;
				}
			});
		});

		// Skeletons
		scene.skeletons?.forEach((s) => {
			s.bones?.forEach((b) => {
				if (!b.metadata) { return; }
				b.id = b.metadata.originalId;
			});
		});

		// PBR materials
		scene.materials?.forEach((m) => {
			if (m.customType === "BABYLON.PBRMaterial" && m.environmentBRDFTexture) {
				delete m.environmentBRDFTexture;
			}
		});

		// GUI
		scene.meshes?.forEach((m) => {
			if (!m.metadata?.guiPath) {
				return;
			}

			const material = editor.scene!.getMaterialById(m.materialId);
			if (material) {
				const activeTextures = material.getActiveTextures();
				if (!activeTextures.find((t) => t instanceof AdvancedDynamicTexture)) {
					return delete m.metadata.guiPath;
				}
			}
			
			const outputFolder = join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory);
			const dest = join(outputFolder, "scenes/_assets", m.metadata.guiPath);

			m.metadata.guiPath = dest.replace(join(outputFolder, "/"), "");
		});

		// Ids
		scene.meshes?.forEach((m) => m.parentId = editor.scene!.getMeshById(m.id)?.parent?.id);
		scene.lights?.forEach((l) => l.parentId = editor.scene!.getLightById(l.id)?.parent?.id);
		scene.cameras?.forEach((c) => c.parentId = editor.scene!.getCameraById(c.id)?.parent?.id);
		scene.transformNodes?.forEach((tn) => tn.parentId = editor.scene!.getTransformNodeById(tn.id)?.parent?.id);

		// Clean
		optimizer.clean();

		// Restore nodes that are not serialized.
		Tools.getAllSceneNodes(editor.scene!).forEach((n) => {
			if (n.metadata?.doNotExport === true) {
				n.doNotSerialize = false;
			}
		});

		return scene;
	}

	/**
	 * Returns the location of the exported scene on the file system.
	 */
	public static GetExportedSceneLocation(): string {
		const projectName = basename(dirname(WorkSpace.Workspace!.lastOpenedScene));
		return join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory, "scenes", projectName);
	}

	/**
	 * Eports the final scene.
	 */
	private static async _ExportFinalScene(editor: Editor, task?: string, options?: IExportFinalSceneOptions): Promise<void> {
		if (!WorkSpace.HasWorkspace()) { return; }

		// Check is isolated mode
		if (editor.preview.state.isIsolatedMode) {
			return editor.notifyMessage("Can't export when Isolated Mode is enabled.", 2000, "error");
		}

		await editor.console.logSection("Exporting Final Scene");

		this._Worker ??= await Workers.LoadWorker("directory.js");

		task = task ?? editor.addTaskFeedback(0, "Generating Final Scene");
		editor.updateTaskFeedback(task, 0, "Generating Final Scene");

		await editor.console.logInfo("Serializing scene...");
		const scene = SceneExporter.GetFinalSceneJson(editor);

		const assetsPath = join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory, "scenes/_assets");

		await FSTools.CreateDirectory(join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory, "scenes"));
		await FSTools.CreateDirectory(assetsPath);

		const scenePath = options?.destPath ?? this.GetExportedSceneLocation();
		await FSTools.CreateDirectory(scenePath);

		editor.updateTaskFeedback(task, 50);
		editor.beforeGenerateSceneObservable.notifyObservers(scenePath);

		// Animation groups
		const animationGroupsPath = join(scenePath, "animationGroups");
		const animationGroupsFolderExists = await pathExists(animationGroupsPath);

		if (animationGroupsFolderExists) {
			const incrementalFiles = await readdir(animationGroupsPath);

			try {
				await Promise.all(incrementalFiles.map((f) => remove(join(animationGroupsPath, f))));
			} catch (e) {
				editor.console.logError("Failed to remove animation group file");
			}
		}

		scene.animationGroups ??= [];
		const externalAnimationGroups = scene.animationGroups.filter((a) => a.metadata?.embedInSceneFile === false);

		if (externalAnimationGroups.length) {
			if (!animationGroupsFolderExists) {
				await FSTools.CreateDirectory(animationGroupsPath);
			}

			const promises: Promise<void>[] = [];
			for (const ag of externalAnimationGroups) {
				promises.push(new Promise<void>(async (resolve) => {
					const path = join(animationGroupsPath, `${filenamify(ag.name)}.json`);

					try {
						await writeJSON(path, ag, { encoding: "utf-8" })
					} catch (e) {
						editor.console.logError(`Failed to write animation group: ${path}`);
					}

					const index = scene.animationGroups.indexOf(ag);
					if (index !== -1) {
						scene.animationGroups.splice(index, 1);
					}

					resolve();
				}));
			}

			await Promise.all(promises);
		} else {
			try {
				await remove(animationGroupsPath);
			} catch (e) {
				editor.console.logError("Failed to remove animation groups output folder.");
			}
		}

		// Handle incremental loading
		const geometriesPath = join(scenePath, "geometries");
		const incrementalFolderExists = await pathExists(geometriesPath);

		if (incrementalFolderExists) {
			const incrementalFiles = await readdir(geometriesPath);

			try {
				await Promise.all(incrementalFiles.map((f) => remove(join(geometriesPath, f))));
			} catch (e) {
				editor.console.logError("Failed to remove incremental geometry file");
			}
		}

		if (!WorkSpace.Workspace?.useIncrementalLoading) {
			try {
				await remove(geometriesPath);
			} catch (e) {
				editor.console.logError("Failed to remove geometries output folder.");
			}
		} else {
			if (!incrementalFolderExists) {
				await FSTools.CreateDirectory(geometriesPath);
			}

			const geometryRootPath = options?.geometryRootPath ?? `../${WorkSpace.GetProjectName()}/`;

			await GeometryExporter.Init();
			await GeometryExporter.ExportIncrementalGeometries(editor, geometriesPath, scene, true, geometryRootPath, task);
		}

		// Copy assets files
		let assetsTree = await Workers.ExecuteFunction<DirectoryWorker, "getDirectoryTree">(this._Worker, "getDirectoryTree", editor.assetsBrowser.assetsDirectory);
		await this._RecursivelyWriteAssets(editor, assetsTree, editor.assetsBrowser.assetsDirectory, assetsPath, options);

		// Handle node material textures
		editor.updateTaskFeedback(task, 70, "Generating Node Material textures...");
		await MaterialTools.ExportSerializedNodeMaterialsTextures(editor, scene.materials, editor.assetsBrowser.assetsDirectory, assetsPath);

		// Second write assets pass for generated textures
		assetsTree = await Workers.ExecuteFunction<DirectoryWorker, "getDirectoryTree">(this._Worker, "getDirectoryTree", editor.assetsBrowser.assetsDirectory);
		await this._RecursivelyWriteAssets(editor, assetsTree, editor.assetsBrowser.assetsDirectory, assetsPath, {
			...options,
			forceRegenerateFiles: false,
		});

		// Write scene
		editor.updateTaskFeedback(task, 50, "Writing scene...");
		await writeJSON(join(scenePath, "scene.babylon"), scene);

		// Tools
		await this.GenerateScripts(editor);
		await this.CopyShaderFiles(editor);

		editor.updateTaskFeedback(task, 100);
		editor.closeTaskFeedback(task, 1000);

		editor.afterGenerateSceneObservable.notifyObservers(scenePath);
		editor.console.logInfo(`Successfully generated scene at ${scenePath}`);
	}

	/**
	 * Recursively re-creates the assets structure in the output folder and copies the supported files.
	 */
	private static async _RecursivelyWriteAssets(editor: Editor, directoryTree: DirectoryTree, assetsPath: string, outputPath: string, options?: IExportFinalSceneOptions): Promise<void> {
		// Don't create empty directories
		if (directoryTree.children?.length === 0) {
			return;
		}

		// Check directory exists
		if (directoryTree.type === "directory" && directoryTree.children?.length) {
			const path = directoryTree.path.replace(assetsPath, outputPath);
			await FSTools.CreateDirectory(path);
		}

		const promises: Promise<void>[] = [];
		const ktxPromises: Promise<void>[] = [];

		for (const child of directoryTree.children ?? []) {
			if (child.type !== "file") {
				continue;
			}

			const path = child.path.replace(assetsPath, outputPath);

			const extension = extname(child.name).toLowerCase();
			if (this.CopyAbleAssetsTypes.indexOf(extension) === -1) {
				continue;
			}

			/*
			const isUsed = await editor.assetsBrowser.isAssetUsed(child.path);
			if (!isUsed) {
				continue;
			}
			*/

			switch (extension) {
				case ".gui":
					promises.push(this._CopyGUIFile(child.path, path));
					editor.console.logInfo(`Copied GUI asset file at: ${path}`);
					break;

				default:
					if (options?.forceRegenerateFiles || !(await pathExists(path))) {
						promises.push(copyFile(child.path, path));
						editor.console.logInfo(`Copied asset file at: ${path}`);
					}
					break;
			}
			

			// KTX
			if (this.CopyAbleImageTypes.indexOf(extension) === -1) {
				continue;
			}

			const ktx2CompressedTextures = WorkSpace.Workspace!.ktx2CompressedTextures;

			const forcedFormat = ktx2CompressedTextures?.forcedFormat ?? "automatic";
			const supportedTextureFormat = (forcedFormat !== "automatic" ? forcedFormat : editor.engine!.texturesSupported[0]) as KTXToolsType;

			if (supportedTextureFormat && ktx2CompressedTextures?.enabled && ktx2CompressedTextures.pvrTexToolCliPath) {
				if (ktxPromises.length > 3) {
					await Promise.all(ktxPromises);
					ktxPromises.splice(0);
				}

				const destFilesDir = dirname(path);

				if (options?.generateAllCompressedTextureFormats) {
					const allKtxPromises: Promise<void>[] = [];

					for (const type of KTXTools.GetAllKtxFormats()) {
						const ktxFilename = KTXTools.GetKtxFileName(path, type);
						if (!options?.forceRegenerateFiles && await pathExists(ktxFilename)) {
							continue;
						}

						allKtxPromises.push(KTXTools.CompressTexture(editor, path, destFilesDir, type));
					}

					promises.push(new Promise<void>(async (resolve) => {
						await Promise.all(allKtxPromises);
						resolve();
					}));
				} else {
					const ktxFilename = KTXTools.GetKtxFileName(path, supportedTextureFormat);
					if (!options?.forceRegenerateCompressedTextures && await pathExists(ktxFilename)) {
						continue;
					}
					
					promises.push(KTXTools.CompressTexture(editor, child.path, destFilesDir, supportedTextureFormat));
				}
			}
		}

		await Promise.all(promises);
		await Promise.all(ktxPromises);

		for (const child of directoryTree.children ?? []) {
			await this._RecursivelyWriteAssets(editor, child, assetsPath, outputPath, options);
		}
	}

	/**
	 * Copies the given GUI file to the given target path by keeping it minified.
	 */
	private static async _CopyGUIFile(sourcePath: string, targetPath: string): Promise<void> {
		// const data = await readJSON(sourcePath, { encoding: "utf-8" });
		// await writeJSON(targetPath, data, { encoding: "utf-8" });
		await copyFile(sourcePath, targetPath);
	}

	/**
	 * Generates the scripts for the project. Will wirte the "tools.ts" file and all index.ts files.
	 * @param editor defines the reference to the editor.
	 */
	public static async GenerateScripts(editor: Editor): Promise<void> {
		// Copy tools
		editor.console.logInfo("Copying tools...");

		const decorators = await readFile(join(AppTools.GetAppPath(), "assets", "scripts", "decorators.ts"), { encoding: "utf-8" });
		await writeFile(join(WorkSpace.DirPath!, "src", "scenes", "decorators.ts"), decorators, { encoding: "utf-8" });

		await copyFile(join(AppTools.GetAppPath(), "assets", "scripts", "fx.ts"), join(WorkSpace.DirPath!, "src", "scenes", "fx.ts"));

		const tools = await readFile(join(AppTools.GetAppPath(), "assets", "scripts", "tools.ts"), { encoding: "utf-8" });
		const finalTools = tools
			.replace("${editor-version}", editor._packageJson.version)
			.replace("\"${project-configuration}\"", JSON.stringify(this.GetProjectConfiguration(editor), null, "\t"));

		await writeFile(join(WorkSpace.DirPath!, "src", "scenes", "tools.ts"), finalTools, { encoding: "utf-8" });

		// Export scripts
		editor.console.logInfo("Configuring scripts...");
		const scriptsMap = await readFile(join(AppTools.GetAppPath(), "assets", "scripts", "scripts-map.ts"), { encoding: "utf-8" });
		const newScriptsMap = await this._UpdateScriptContent(editor, scriptsMap);
		await writeFile(join(WorkSpace.DirPath!, "src", "scenes", "scripts-map.ts"), newScriptsMap, { encoding: "utf-8" });

		// Export scene content
		/*
		editor.console.logInfo("Configuring scene entry point...");
		const scriptsContent = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "scene", "index.ts"), { encoding: "utf-8" });

		const indexPath = join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName());

		await FSTools.CreateDirectory(indexPath);

		await writeFile(join(indexPath, "index.ts"), scriptsContent, { encoding: "utf-8" });
		*/
	}

	/**
	 * Copies the shader files located in the "src" folder to the output src folder of the typescript build.
	 * Typescript build folder is located in the "build" folder of the workspace. This is mainly used to allow
	 * testing the game in the editor as shader files are required using "require" and transformed to raw by webpack
	 * for the web version.
	 * @param editor defines the reference to the editor.
	 */
	public static async CopyShaderFiles(editor: Editor): Promise<void> {
		editor.console.logInfo("Copying shader files...");

		const buildFolder = join(WorkSpace.DirPath!, "build");
		if (!(await pathExists(buildFolder))) {
			return;
		}

		const files = await FSTools.GetGlobFiles(join(WorkSpace.DirPath!, "src", "**", "*.fx"));

		await Promise.all(files.map(async (f) => {
			const dest = f.replace(join(WorkSpace.DirPath!, "/"), join(WorkSpace.DirPath!, "build", "/"));

			if (!(await pathExists(dirname(dest)))) {
				return;
			}

			await copyFile(f, dest);
			editor.console.logInfo(`Copied shader file "${f}" to "${dest}"`);
		}));
	}

	/**
	 * Copies the current project configuration as a Json file.
	 * @param editor defines the editor reference.
	 */
	public static GetProjectConfiguration(editor: Editor): any {
		if (!WorkSpace.Workspace) {
			return;
		}

		editor.console.logInfo("Computing project configuration...");

		const projectConfiguration = {
			compressedTextures: {
				supportedFormats: [] as string[],
			},
		};

		// Compressed Textures
		if (WorkSpace.Workspace?.ktx2CompressedTextures?.enabled) {
			projectConfiguration.compressedTextures.supportedFormats.push("-dxt.ktx");
			projectConfiguration.compressedTextures.supportedFormats.push("-astc.ktx");
			projectConfiguration.compressedTextures.supportedFormats.push("-pvrtc.ktx");

			if (WorkSpace.Workspace.ktx2CompressedTextures.ect1Options?.enabled) {
				projectConfiguration.compressedTextures.supportedFormats.push("-etc1.ktx");
			}

			if (WorkSpace.Workspace.ktx2CompressedTextures.ect2Options?.enabled) {
				projectConfiguration.compressedTextures.supportedFormats.push("-etc2.ktx");
			}
		}

		return projectConfiguration;
	}

	/**
	 * Exports all available graphs in the scene.
	 * @param editor defines the reference to the editor.
	 */
	public static async ExportGraphs(editor: Editor): Promise<void> {
		// Write all graphs
		const destGraphs = join(WorkSpace.DirPath!, "src", "scenes", "_graphs");
		if (await pathExists(destGraphs)) {
			await FSTools.RemoveDirectory(destGraphs);
		}

		const graphs = await FSTools.GetGlobFiles(join(editor.assetsBrowser.assetsDirectory, "**", "*.graph"));
		if (graphs?.length) {
			GraphCode.Init();
			await GraphCodeGenerator.Init();
		} else {
			return;
		}

		await FSTools.CreateDirectory(destGraphs);

		for (const g of graphs ?? []) {
			const name = g.replace(join(editor.assetsBrowser.assetsDirectory, "/"), "").replace(/\//g, "_");
			const json = await readJSON(g);

			try {
				const code = GraphCodeGenerator.GenerateCode(new LGraph(json))?.replace("${editor-version}", editor._packageJson.version);
				await writeFile(join(destGraphs, filenamify(`${name}.ts`)), code);
			} catch (e) {
				console.error(e);
			}
		}
	}

	/**
	 * Updates the script content to be written.
	 */
	private static async _UpdateScriptContent(editor: Editor, scriptsContent: string): Promise<string> {
		// Write all graphs.
		await this.ExportGraphs(editor);

		// Export scripts.
		const all = await editor.assetsBrowser.getAllScripts();
		return scriptsContent.replace("${editor-version}", editor._packageJson.version).replace("// ${scripts}", all.map((s) => {
			const toReplace = `src/scenes/`;
			const extension = extname(s);
			return `\t"${s}": require("./${s.replace(toReplace, "").replace(extension, "")}"),`;
		}).join("\n")).replace("// ${scriptsInterface}", all.map((s) => {
			return `\t"${s}": ScriptMap;`;
		}).join("\n"));
	}
}
