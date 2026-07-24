import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";
import { GaussianSplattingMesh } from "@babylonjs/core/Meshes/GaussianSplatting/gaussianSplattingMesh";

import { loadFile } from "../tools/request";

let registered = false;

export function registerGaussianSplattingParser() {
	if (registered) {
		return;
	}

	registered = true;

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

				scene.removePendingData(splatDataUrl);
			});
		});
	});
}
