import { isAbsolute } from "path";
import { join, dirname, basename } from "path/posix";
import { pathExists, readFile, readJSON, writeFile } from "fs-extra";

import axios from "axios";
import { toast } from "sonner";

import {
	CubeTexture,
	ISceneLoaderAsyncResult,
	Material,
	Node,
	Scene,
	SceneLoader,
	Texture,
	Tools,
	ColorGradingTexture,
	Vector3,
	Quaternion,
	Sprite,
	IParticleSystem,
} from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";
import { isMesh } from "../../../../tools/guards/nodes";
import { isSprite } from "../../../../tools/guards/sprites";
import { isTexture } from "../../../../tools/guards/texture";
import { executeSimpleWorker } from "../../../../tools/worker";
import { isMultiMaterial } from "../../../../tools/guards/material";
import { configureSimultaneousLightsForMaterial } from "../../../../tools/material/material";
import { onNodesAddedObservable, onTextureAddedObservable } from "../../../../tools/observables";

import { projectConfiguration } from "../../../../project/configuration";

export async function tryConvertSceneFile(absolutePath: string, progress?: (percent: number) => void): Promise<string> {
	const toolsUrl = process.env.EDITOR_TOOLS_URL ?? "https://editor.babylonjs.com";
	const buffer = (await readFile(absolutePath)) as Buffer<ArrayBuffer>;
	const blob = new Blob([buffer], { type: "application/octet-stream" });
	const file = new File([blob], basename(absolutePath), { type: "application/octet-stream" });

	const form = new FormData();
	form.append("file", file);

	try {
		const { data } = await axios.post(`${toolsUrl}/api/converter`, form, {
			responseType: "arraybuffer",
			onUploadProgress: (event) => {
				if (event.progress) {
					progress?.(event.progress * 100);
				}
			},
		});

		const destination = join(dirname(absolutePath), `editor-generated_${basename(absolutePath)}.glb`);
		await writeFile(destination, Buffer.from(data));

		return destination;
	} catch (e) {
		console.error(e);
		return "";
	}
}

export async function loadImportedSceneFile(scene: Scene, absolutePath: string): Promise<ISceneLoaderAsyncResult | null> {
	if (!projectConfiguration.path) {
		return null;
	}

	let result: ISceneLoaderAsyncResult;

	try {
		result = await SceneLoader.ImportMeshAsync("", join(dirname(absolutePath), "/"), basename(absolutePath), scene);
	} catch (e) {
		console.error(e);
		toast.error("Failed to load the scene file.");
		return null;
	}

	const root = result.meshes.find((m) => m.name === "__root__");
	if (root) {
		root.scaling.scaleInPlace(100);
		root.name = basename(absolutePath);

		// TODO: try cleaning the gltf to remove useless transform nodes. Also, does it make sens to clean the gltf for the user?
		// cleanImportedGltf(result);
	}

	result.meshes.forEach((mesh) => {
		configureImportedNodeIds(mesh);

		mesh.receiveShadows = true;

		if (mesh.skeleton) {
			mesh.skeleton.id = Tools.RandomId();
			mesh.skeleton["_uniqueId"] = UniqueNumber.Get();
			mesh.skeleton.bones.forEach((bone) => configureImportedNodeIds(bone));
		}

		if (mesh.morphTargetManager) {
			mesh.morphTargetManager["_uniqueId"] = UniqueNumber.Get();

			for (let i = 0, len = mesh.morphTargetManager.numTargets; i < len; i++) {
				const target = mesh.morphTargetManager.getTarget(i);
				if (!target) {
					continue;
				}

				target.id = Tools.RandomId();
				target["_uniqueId"] = UniqueNumber.Get();
				target.name = `${mesh.name}_${target.name}`;
			}
		}
	});

	result.lights.forEach((light) => configureImportedNodeIds(light));
	result.transformNodes.forEach((transformNode) => configureImportedNodeIds(transformNode));
	result.animationGroups.forEach((animationGroup) => (animationGroup.uniqueId = UniqueNumber.Get()));

	scene.lights.forEach((light) => {
		const shadowMap = light.getShadowGenerator()?.getShadowMap();
		if (!shadowMap?.renderList) {
			return;
		}

		result.meshes.forEach((mesh) => {
			shadowMap.renderList!.push(mesh);
		});
	});

	const configuredEmbeddedTextures: number[] = [];

	result.meshes.forEach((mesh) => {
		if (isMesh(mesh)) {
			if (mesh.geometry) {
				mesh.geometry.id = Tools.RandomId();
				mesh.geometry.uniqueId = UniqueNumber.Get();
			}

			if (mesh.material) {
				configureImportedMaterial(mesh.material);

				if (isMultiMaterial(mesh.material)) {
					mesh.material.subMaterials.forEach((subMaterial) => {
						if (subMaterial) {
							configureImportedMaterial(subMaterial);
							configureSimultaneousLightsForMaterial(subMaterial);
						}
					});
				} else {
					configureSimultaneousLightsForMaterial(mesh.material);
				}
			}
		}

		const textures = mesh.material?.getActiveTextures();

		textures?.forEach((texture) => {
			if (isTexture(texture)) {
				if (configuredEmbeddedTextures.includes(texture.uniqueId)) {
					return;
				}

				configuredEmbeddedTextures.push(texture.uniqueId);

				configureImportedTexture(texture);
				configureEmbeddedTexture(texture, absolutePath);
			}
		});
	});

	onNodesAddedObservable.notifyObservers();

	return result;
}

export function configureImportedNodeIds(node: Node | Sprite | IParticleSystem): void {
	if (!isSprite(node)) {
		node.id = Tools.RandomId();
	}

	node.uniqueId = UniqueNumber.Get();
}

export function configureImportedMaterial(material: Material): void {
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();
}

export function configureImportedTexture<T extends Texture | CubeTexture | ColorGradingTexture>(texture: T, noCheckInvertY?: boolean): T {
	if (isAbsolute(texture.name)) {
		if (!noCheckInvertY && isTexture(texture) && !texture.invertY && !texture._buffer) {
			texture._invertY = true;
			texture.vScale *= -1;
			texture.updateURL(texture.name);
		}

		texture.name = texture.name.replace(join(dirname(projectConfiguration.path!), "/"), "");
		texture.url = texture.name;
	}

	return texture;
}

export async function configureEmbeddedTexture(texture: Texture, absolutePath: string): Promise<unknown> {
	if (!projectConfiguration.path) {
		return;
	}

	if (!texture._buffer || !texture.mimeType) {
		return onTextureAddedObservable.notifyObservers(texture);
	}

	let extension = "";
	switch (texture.mimeType) {
		case "image/png":
			extension = "png";
			break;
		case "image/gif":
			extension = "gif";
			break;
		case "image/jpeg":
			extension = "jpg";
			break;
		case "image/bmp":
			extension = "bmp";
			break;
		default:
			return;
	}

	let buffer: Buffer;
	if (typeof texture._buffer === "string") {
		const byteString = atob(texture._buffer);
		const ab = new ArrayBuffer(byteString.length);

		const ia = new Uint8Array(ab);
		for (let i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}

		buffer = Buffer.from(ia);
	} else {
		buffer = Buffer.from(texture._buffer as Uint8Array);
	}

	let filename = texture.url;
	filename = filename?.split(":")[1] ?? filename; // in case prefiexed by data:

	if (filename && !(await pathExists(filename))) {
		const hash = await executeSimpleWorker("workers/md5.js", buffer);
		filename = join(dirname(absolutePath), `editor-generated_${hash}.${extension}`);

		if (!(await pathExists(filename))) {
			await writeFile(filename, buffer);
		}

		if (!texture.invertY) {
			texture._invertY = true;
			texture.vScale *= -1;
			texture.updateURL(filename);
		}
	}

	if (!filename) {
		return;
	}

	const relativePath = filename.replace(join(dirname(projectConfiguration.path!), "/"), "");
	texture.name = relativePath;
	texture.url = relativePath;

	texture._buffer = null;

	onTextureAddedObservable.notifyObservers(texture);
}

export async function loadImportedMaterial(scene: Scene, absolutePath: string): Promise<Material | null> {
	if (!projectConfiguration.path) {
		return null;
	}

	const data = await readJSON(absolutePath);
	const uniqueId = data.uniqueId;

	const existingMaterial = scene.materials.find((material) => material.uniqueId === uniqueId);
	if (existingMaterial) {
		return existingMaterial;
	}

	const material = Material.Parse(data, scene, join(dirname(projectConfiguration.path!), "/"));
	if (!material) {
		return null;
	}

	material.uniqueId = uniqueId;

	return material;
}

export function cleanImportedGltf(result: ISceneLoaderAsyncResult): void {
	const identityQuaternion = Quaternion.Identity();
	const allBones = result?.skeletons.map((s) => s.bones).flat();

	result.transformNodes.slice().forEach((transformNode) => {
		if (
			transformNode.position.equalsWithEpsilon(Vector3.ZeroReadOnly) &&
			(transformNode.rotation.equalsWithEpsilon(Vector3.ZeroReadOnly) || transformNode.rotationQuaternion?.equalsWithEpsilon(identityQuaternion)) &&
			transformNode.scaling.equalsWithEpsilon(Vector3.OneReadOnly) &&
			!allBones.find((b) => b._linkedTransformNode === transformNode)
		) {
			const descendants = transformNode.getDescendants(true);
			descendants.forEach((node) => {
				node.parent = transformNode.parent;
			});

			transformNode.dispose(true, false);
		}
	});
}
