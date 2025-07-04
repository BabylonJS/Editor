import { Server, Socket } from "net";
import { copyFile, mkdir, pathExists } from "fs-extra";
import { dirname, join, basename, extname } from "path/posix";

import { PBRMaterial } from "babylonjs";
import { Editor } from "babylonjs-editor";

import { importMaterial } from "./material";
import { QuixelJsonType, QuixelLodListType } from "./typings";
import { importMeshes, saveMeshesAsBabylonFormat } from "./mesh";

export const title = "Quixel Bridge";
export const description = "Quixel Bridge integration for Babylon.js Editor";

let server: Server | null = null;

export function main(editor: Editor): void {
	createRootFolder(editor);

	server = new Server((s) => {
		handeServerEvents(editor, s);
	});

	server.listen(24981);
}

export function close(): void {
	try {
		server?.close();
	} catch (e) {
		// Catch silently
	} finally {
		server = null;
	}
}

function handeServerEvents(editor: Editor, socket: Socket): void {
	let buffer: Buffer | null = null;

	socket.on("data", (d: Buffer) => {
		if (!buffer) {
			buffer = Buffer.from(d);
		} else {
			buffer = Buffer.concat([buffer, d]);
		}
	});

	socket.on("end", async () => {
		if (!buffer) {
			return;
		}

		try {
			const data = JSON.parse(buffer.toString("utf-8")) as QuixelJsonType[];

			data.forEach((json) => {
				handleParsedAsset(editor, json);
			});
		} catch (e) {
			editor.layout.console.error("Failed to parse quixel JSON.");
		}

		buffer = null;
	});
}

async function createRootFolder(editor: Editor): Promise<void> {
	if (!editor.state.projectPath) {
		return;
	}

	const assetsFolder = join(dirname(editor.state.projectPath), "assets");
	if (!await pathExists(assetsFolder)) {
		await mkdir(assetsFolder);
	}

	const quixelFolder = join(assetsFolder, "quixel");
	if (!await pathExists(quixelFolder)) {
		await mkdir(quixelFolder);
	}
}

async function handleParsedAsset(editor: Editor, json: QuixelJsonType) {
	if (!editor.state.projectPath) {
		return;
	}

	json.path = json.path.replace(/\\/g, "/");

	// Create folders
	const quixelFolder = join(dirname(editor.state.projectPath), "assets", "quixel");

	const assetFolder = join(quixelFolder, basename(json.path));
	if (!await pathExists(assetFolder)) {
		await mkdir(assetFolder);
	}

	const material = await importMaterial(editor, json, assetFolder);

	switch (json.type) {
		case "3d":
			await handleParse3d(editor, json, assetFolder, material);
			break;

		case "3dplant":
			await handleImport3dPlant(editor, json, assetFolder, material);
			break;
	}

	// Write preview for folder
	if (json.previewImage) {
		const extension = extname(json.previewImage);
		await copyFile(json.previewImage, join(assetFolder, `editor_preview${extension}`));
	}

	editor.layout.graph.refresh();
	editor.layout.assets.refresh();
}

async function handleParse3d(editor: Editor, json: QuixelJsonType, assetFolder: string, material: PBRMaterial | null) {
	const meshes = await importMeshes(editor, json.lodList);
	meshes.forEach((mesh) => {
		mesh.material = material;

		mesh.getLODLevels().forEach((lodLevel) => {
			if (lodLevel.mesh) {
				lodLevel.mesh.material = material;
			}
		});
	});

	saveMeshesAsBabylonFormat(editor, meshes, assetFolder);
}

async function handleImport3dPlant(editor: Editor, json: QuixelJsonType, assetFolder: string, material: PBRMaterial | null) {
	const variationsMap = new Map<number, QuixelLodListType[]>();
	json.lodList.forEach((lod) => {
		if (lod.variation === undefined) {
			return;
		}

		let variations = variationsMap.get(lod.variation);
		if (!variations) {
			variations = [lod];
			variationsMap.set(lod.variation, variations);
		} else {
			variations.push(lod);
		}
	});

	for (const [variation, lodList] of variationsMap) {
		const meshes = await importMeshes(editor, lodList);
		meshes.forEach((mesh) => {
			mesh.material = material;

			mesh.getLODLevels().forEach((lodLevel) => {
				if (lodLevel.mesh) {
					lodLevel.mesh.material = material;
				}
			});
		});

		saveMeshesAsBabylonFormat(editor, meshes, assetFolder, variation);
	}
}
