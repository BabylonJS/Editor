import { Server, Socket } from "net";
import { copyFile, ensureDir } from "fs-extra";
import { dirname, join, basename } from "path/posix";

import { PBRMaterial } from "babylonjs";
import { Editor, loadImportedSceneFile } from "babylonjs-editor";

import { IFabJson } from "./typings";
import { parseMaterial } from "./material";
import { FabRootComponent } from "./ui/root";

export const title = "Fab Plugin";
export const description = "Fab Plugin integration for Babylon.js Editor";

const tabId = "babylonjs-editor-fab-plugin-tab";

let server: Server | null = null;

export function main(editor: Editor): void {
	createRootFolder(editor);

	server = new Server((s) => {
		handeServerEvents(editor, s);
	});

	server.listen(31337);

	editor.layout.addLayoutTab(<FabRootComponent />, {
		id: tabId,
		title: "Fab",
		enableClose: false,
	});
}

export function close(editor: Editor): void {
	editor.layout.removeLayoutTab(tabId);
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
			const data = JSON.parse(buffer.toString("utf-8")) as IFabJson[];
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

	const assetsFolder = join(dirname(editor.state.projectPath), "assets/fab");
	await ensureDir(assetsFolder);
}

async function handleParsedAsset(editor: Editor, json: IFabJson) {
	if (!editor.state.projectPath) {
		return;
	}

	const assetsFolder = join(dirname(editor.state.projectPath), "assets/fab");
	const finalAssetFolder = join(assetsFolder, json.metadata.fab.listing.title);

	await ensureDir(finalAssetFolder);

	const promises: Promise<void>[] = [];
	const materialsMap = new Map<number, PBRMaterial>();

	for (const mesh of json.meshes) {
		if (promises.length >= 10) {
			await Promise.all(promises);
			promises.splice(0, promises.length);
		}

		if (mesh.file) {
			if (mesh.material_index >= 0 && !materialsMap.has(mesh.material_index)) {
				const material = json.materials[mesh.material_index];
				if (material) {
					materialsMap.set(mesh.material_index, await parseMaterial(editor, material, finalAssetFolder));
				}
			}

			const dest = join(finalAssetFolder, basename(mesh.file));

			promises.push(
				new Promise<void>(async (resolve) => {
					const log = await editor.layout.console.progress(`Importing Fab mesh: ${mesh.name}...`);

					await copyFile(mesh.file, dest);

					const result = await loadImportedSceneFile(editor.layout.preview.scene, dest);
					result?.meshes.forEach((m) => {
						m.material = materialsMap.get(mesh.material_index) ?? m.material;
					});

					log.setState({
						done: true,
						message: `Imported Fab mesh: ${mesh.name}`,
					});

					resolve();
				})
			);
		}
	}

	await Promise.all(promises);

	editor.layout.graph.refresh();
	editor.layout.assets.refresh();
}
