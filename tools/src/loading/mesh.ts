import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

let registered = false;

export function registerMeshParser() {
	if (registered) {
		return;
	}
	registered = true;

	AddParser("MeshEditorPlugin", (parsedData: any, _scene: Scene, container: AssetContainer, _rootUrl: string) => {
		parsedData.meshes?.forEach((mesh) => {
			mesh.instances?.forEach((instanceData) => {
				const instance = container.meshes?.find((m) => m.id === instanceData.id);
				if (!instance) {
					return;
				}

				if (instanceData.billboardMode !== undefined) {
					instance.billboardMode = instanceData.billboardMode;
				}
			});
		});
	});
}
