import { dirname, join } from "path/posix";
import { ensureDir, readFile, writeFile } from "fs-extra";

import { Tools, PickingInfo, Mesh, MeshBuilder, Vector3, PBRMaterial } from "babylonjs";

import { Tween } from "../animation/tween";

import { setNodeLocked, setNodeSerializable, setNodeVisibleInGraph } from "../node/metadata";

import { projectConfiguration } from "../../project/configuration";

import { Editor } from "../../editor/main";

import { loadImportedSceneFile } from "../../editor/layout/preview/import/import";

export const processingImages = new Map<string, boolean>();

export async function aiGenerateMeshFromImage(editor: Editor, absolutePath: string, pickInfo?: PickingInfo) {
	if (!projectConfiguration.path || processingImages.has(absolutePath)) {
		return;
	}

	processingImages.set(absolutePath, true);

	let box: Mesh | null = null;
	let sphere: Mesh | null = null;

	if (pickInfo && pickInfo.pickedPoint) {
		box = MeshBuilder.CreateBox("box", { size: 20 }, editor.layout.preview.scene);
		box.position.copyFrom(pickInfo.pickedPoint);
		box.position.y += 75;
		setNodeLocked(box, true);
		setNodeSerializable(box, false);
		setNodeVisibleInGraph(box, false);

		sphere = MeshBuilder.CreateSphere("sphere", { diameter: 10 }, editor.layout.preview.scene);
		sphere.position.copyFrom(pickInfo.pickedPoint);
		sphere.position.y += 5;
		setNodeLocked(sphere, true);
		setNodeSerializable(sphere, false);
		setNodeVisibleInGraph(sphere, false);

		Tween.create(box, 1, {
			delay: 1,
			loop: true,
			rotation: {
				from: Vector3.Zero(),
				to: new Vector3(Math.PI * 2, Math.PI * 2, Math.PI * 2),
			},
		});

		const material = new PBRMaterial("boxMaterial", editor.layout.preview.scene);
		material.alphaMode = PBRMaterial.MATERIAL_ALPHABLEND;
		material.alpha = 0.35;
		material.metallic = 0;
		material.roughness = 1;
		box.material = material;
		sphere.material = material;
	}

	const buffer = Buffer.from(await readFile(absolutePath));
	const base64 = buffer.toString("base64");

	try {
		const response = await fetch("http://localhost:7866/generate", {
			method: "POST",
			body: JSON.stringify({
				image: base64,
				texture: true,
				// text: "A dog",
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const uid = Tools.RandomId();
		const data = await response.arrayBuffer();

		const outputFolder = join(dirname(projectConfiguration.path), "assets/generated_3d", uid);
		await ensureDir(outputFolder);
		await writeFile(join(outputFolder, "mesh.glb"), Buffer.from(data));

		const result = await loadImportedSceneFile(editor.layout.preview.scene, join(outputFolder, "mesh.glb"), true);
		if (pickInfo) {
			result?.meshes.forEach((m) => !m.parent && m.position.addInPlace(pickInfo.pickedPoint!));
			result?.transformNodes.forEach((t) => !t.parent && t.position.addInPlace(pickInfo.pickedPoint!));
		}
	} catch (e) {
		// Catch silently.
	}

	if (box) {
		Tween.killTweensOf(box);
		box.dispose(true, true);
	}

	if (sphere) {
		sphere.dispose(true, true);
	}

	processingImages.delete(absolutePath);
}
