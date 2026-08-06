import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";
import { GaussianSplattingMesh } from "@babylonjs/core/Meshes/GaussianSplatting/gaussianSplattingMesh";
import { GaussianSplattingCompoundMesh } from "@babylonjs/core/Meshes/GaussianSplatting/gaussianSplattingCompoundMesh";

import { loadFile } from "../tools/request";

let registered = false;

export function registerGaussianSplattingParser() {
	if (registered) {
		return;
	}

	registered = true;

	let compountMesh: GaussianSplattingCompoundMesh | null = null;

	AddParser("GaussianSplattingMeshEditorPlugin", (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
		parsedData.meshes?.forEach((mesh) => {
			if (mesh.type !== "GaussianSplattingMesh" || !mesh.splatDataPath) {
				return;
			}

			const instantiatedMesh = container.meshes.find((m) => m.id === mesh.id) as GaussianSplattingMesh;
			if (!instantiatedMesh) {
				return;
			}

			const splatDataUrl = rootUrl + mesh.splatDataPath;
			scene.addPendingData(splatDataUrl);

			loadFile(splatDataUrl, "arraybuffer").then(async (data) => {
				instantiatedMesh.updateData(data, undefined, {
					flipY: mesh._flipY,
				});

				scene.removeMesh(instantiatedMesh);

				mesh.proxies.forEach((proxy) => {
					compountMesh ??= new GaussianSplattingCompoundMesh("GaussianSplattingCompoundMesh", undefined, scene);

					const proxyMesh = compountMesh.addPart(instantiatedMesh, false);

					proxyMesh.name = proxy.name;
					proxyMesh.id = proxy.id;
					proxyMesh.uniqueId = proxy.uniqueId;

					proxyMesh.metadata = proxy.metadata ?? {};
					proxyMesh.metadata._waitingParentId = proxy.metadata?.parentId;

					proxyMesh.setEnabled(proxy.isEnabled ?? true);

					if (proxy.position) {
						proxyMesh.position.copyFromFloats(proxy.position[0], proxy.position[1], proxy.position[2]);
					}
					if (proxy.rotation) {
						proxyMesh.rotation.copyFromFloats(proxy.rotation[0], proxy.rotation[1], proxy.rotation[2]);
					}
					if (proxy.rotationQuaternion) {
						proxyMesh.rotationQuaternion?.copyFromFloats(
							proxy.rotationQuaternion[0],
							proxy.rotationQuaternion[1],
							proxy.rotationQuaternion[2],
							proxy.rotationQuaternion[3]
						);
					}
					if (proxy.scaling) {
						proxyMesh.scaling.copyFromFloats(proxy.scaling[0], proxy.scaling[1], proxy.scaling[2]);
					}

					if (proxy.parentId) {
						const parent = container.getNodes().find((n) => n.id === proxy.parentId);
						if (parent) {
							proxyMesh.parent = parent;
						} else {
							proxyMesh._waitingParentId = proxy.parentId;
						}
					}
				});

				scene.removePendingData(splatDataUrl);
			});
		});
	});
}
