import { Scene } from "@babylonjs/core/scene";
import { WebRequest } from "@babylonjs/core/Misc/webRequest";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

let registered = false;

export function registerMorphTargetManagerParser() {
	if (registered) {
		return;
	}

	registered = true;

	AddParser("MorphTargetManagerEditorPlugin", (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
		parsedData.morphTargetManagers.forEach((morphTargetManagerData: any) => {
			const meshInstance = container.meshes.find((mesh) => {
				return mesh.id === morphTargetManagerData.meshId;
			});

			const morphTargetManager = meshInstance?.morphTargetManager;
			if (!morphTargetManager) {
				return;
			}

			const shouldExit = morphTargetManagerData.targets.find((target) => !target.delayLoadingFile);
			if (shouldExit) {
				return;
			}

			const promises: Promise<ArrayBuffer | null>[] = [];

			morphTargetManagerData.targets.forEach((target) => {
				if (!target.delayLoadingFile) {
					return promises.push(Promise.resolve(null));
				}

				const absolutePath = `${rootUrl}${target.delayLoadingFile}`;

				scene.addPendingData(absolutePath);

				const request = new WebRequest();
				request.responseType = "arraybuffer";
				request.open("GET", absolutePath);
				request.send();

				promises.push(
					new Promise<ArrayBuffer>((resolve) => {
						request.addEventListener("load", () => {
							scene.removePendingData(absolutePath);
							resolve(request.response as ArrayBuffer);
						});
					})
				);
			});

			Promise.all(promises).then((allBuffers) => {
				for (let i = 0, len = morphTargetManager.numTargets; i < len; ++i) {
					const instancedTarget = morphTargetManager.getTarget(i);
					const sourceTargetData = morphTargetManagerData.targets[i];
					const buffer = allBuffers[i]!;

					if (sourceTargetData.positionsCount) {
						const positions = new Float32Array(buffer, sourceTargetData.positionsOffset, sourceTargetData.positionsCount);
						instancedTarget["_positions"] = positions;
						instancedTarget.setPositions(positions);
					}

					if (sourceTargetData.normalsCount) {
						const normals = new Float32Array(buffer, sourceTargetData.normalsOffset, sourceTargetData.normalsCount);
						instancedTarget["_normals"] = normals;
						instancedTarget.setNormals(normals);
					}

					if (sourceTargetData.tangentsCount) {
						const tangents = new Float32Array(buffer, sourceTargetData.tangentsOffset, sourceTargetData.tangentsCount);
						instancedTarget["_tangents"] = tangents;
						instancedTarget.setTangents(tangents);
					}

					if (sourceTargetData.uvsCount) {
						const uvs = new Float32Array(buffer, sourceTargetData.uvsOffset, sourceTargetData.uvsCount);
						instancedTarget["_uvs"] = uvs;
						instancedTarget.setUVs(uvs);
					}

					if (sourceTargetData.uv2sCount) {
						const uv2s = new Float32Array(buffer, sourceTargetData.uv2sOffset, sourceTargetData.uv2sCount);
						instancedTarget["_uv2s"] = uv2s;
						instancedTarget.setUV2s(uv2s);
					}
				}

				for (let i = 0, len = morphTargetManager.numTargets; i < len; ++i) {
					const instancedTarget = morphTargetManager.getTarget(i);
					instancedTarget._onDataLayoutChanged.notifyObservers();
				}
			});
		});
	});
}
