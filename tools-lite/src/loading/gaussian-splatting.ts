import { createProceduralGaussianSplattingMesh, GaussianSplattingMesh, SceneContext } from "@babylonjs/lite";

import { loadFile } from "../tools/request";
import { setClassName } from "../tools/guards";

import { applySerializedTransform } from "./mesh";

/**
 * Defines a proxy of a gaussian splatting mesh created in the editor, with its serialized data.
 */
export interface IGaussianSplattingProxy {
	mesh: GaussianSplattingMesh;
	data: any;
}

/**
 * Loads the gaussian splatting data of the given serialized gaussian splatting mesh (`.babylonbinarysplatdata`) and
 * creates one Babylon Lite gaussian splatting mesh for each of its proxies. Babylon Lite has no compound gaussian
 * splatting mesh: each proxy is a gaussian splatting mesh of its own sharing the splats data. The spherical harmonics
 * are not supported.
 * @param scene defines the reference to the scene where to add the gaussian splatting meshes.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized gaussian splatting mesh.
 * @returns the list of the created gaussian splatting meshes.
 */
export async function parseGaussianSplattingMesh(scene: SceneContext, rootUrl: string, data: any): Promise<IGaussianSplattingProxy[]> {
	if (!data.splatDataPath) {
		return [];
	}

	let splatData: ArrayBuffer;
	try {
		splatData = await loadFile(`${rootUrl}${data.splatDataPath}`, "arraybuffer");
	} catch (e) {
		console.error(`Failed to load the gaussian splatting data of "${data.name}".`, e);
		return [];
	}

	if (data.shDataPaths?.length) {
		console.warn(`Babylon.js Editor Tools Lite: the spherical harmonics of the gaussian splatting mesh "${data.name}" are not supported by Babylon Lite.`);
	}

	// The splats data uses the Babylon.js layout: 32 bytes per splat.
	const splatCount = Math.floor(splatData.byteLength / 32);
	if (!splatCount) {
		return [];
	}

	const proxies = (data.proxies?.length ? data.proxies : [{ ...data, metadata: data.metadata }]) as any[];

	return proxies.map((proxy) => {
		const mesh = createProceduralGaussianSplattingMesh(scene, proxy.name ?? data.name, splatCount);
		mesh.updateData(splatData.slice(0, splatCount * 32));

		mesh.id = proxy.id;
		mesh.uniqueId = proxy.uniqueId;
		mesh.metadata = proxy.metadata ?? {};

		applySerializedTransform(mesh, proxy);
		setClassName(mesh, "GaussianSplattingMesh");

		return { mesh, data: proxy };
	});
}
