import { dirname, join } from "path/posix";
import { ensureDir, readFile, writeFile } from "fs-extra";

import { Tools, PickingInfo, Mesh, MeshBuilder, Vector3, PBRMaterial } from "babylonjs";

import { Tween } from "../animation/tween";

import { wait } from "../tools";
import { setNodeLocked, setNodeSerializable, setNodeVisibleInGraph } from "../node/metadata";

import { projectConfiguration } from "../../project/configuration";

import { Editor } from "../../editor/main";

import { loadImportedSceneFile } from "../../editor/layout/preview/import/import";

export const processingImages = new Map<string, boolean>();

export interface IAIGenerateMeshFromImageOptions {
	prompt?: string;
	imageAbsolutePath?: string;
}

export async function aiGenerateMesh(editor: Editor, pickInfo: PickingInfo | undefined, options: IAIGenerateMeshFromImageOptions) {
	if (!projectConfiguration.path) {
		return;
	}

	if (options.imageAbsolutePath && processingImages.has(options.imageAbsolutePath)) {
		return;
	}

	if (options.prompt && processingImages.has(options.prompt)) {
		return;
	}

	if (options.prompt) {
		processingImages.set(options.prompt, true);
	}

	if (options.imageAbsolutePath) {
		processingImages.set(options.imageAbsolutePath, true);
	}

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

	let image: string | undefined;
	if (options.imageAbsolutePath) {
		const buffer = Buffer.from(await readFile(options.imageAbsolutePath));
		image = buffer.toString("base64");
	}

	const log = await editor.layout.console.progress("Generating 3D model from image...");

	try {
		const taskResponse = await fetch("http://localhost:7860/send", {
			method: "POST",
			body: JSON.stringify({
				image,
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});
		const taskData = await taskResponse.json();

		let data: ArrayBuffer | null = null;
		while (!data) {
			await wait(3000);

			const checkResponse = await fetch(`http://localhost:7860/status/${taskData.uid}`, {
				method: "GET",
			});
			const checkData = await checkResponse.json();

			log.setState({
				message: `Generating 3D model from image... ${checkData.status}`,
			});

			switch (checkData.status) {
				case "completed":
					data = Buffer.from(checkData.model_base64, "base64").buffer;
					break;
			}
		}

		log.setState({
			done: true,
			message: `Generating 3D model from image.`,
		});

		const uid = Tools.RandomId();
		const outputFolder = join(dirname(projectConfiguration.path), "assets/generated_3d", uid);

		await ensureDir(outputFolder);
		await writeFile(join(outputFolder, "mesh.glb"), Buffer.from(data));

		const result = await loadImportedSceneFile(editor.layout.preview.scene, join(outputFolder, "mesh.glb"));
		if (pickInfo) {
			result?.meshes.forEach((m) => !m.parent && m.position.addInPlace(pickInfo.pickedPoint!));
			result?.transformNodes.forEach((t) => !t.parent && t.position.addInPlace(pickInfo.pickedPoint!));
		}
	} catch (e) {
		log.setState({
			error: true,
			message: `Generating 3D model from image: ${e.message}`,
		});
	}

	if (box) {
		Tween.killTweensOf(box);
		box.dispose(true, true);
	}

	if (sphere) {
		sphere.dispose(true, true);
	}

	if (options.prompt) {
		processingImages.delete(options.prompt);
	}

	if (options.imageAbsolutePath) {
		processingImages.delete(options.imageAbsolutePath);
	}
}
