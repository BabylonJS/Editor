import { basename, join } from "path/posix";

import { Node, PBRMaterial, Vector3 } from "babylonjs";
import { Editor, loadImportedSceneFile } from "babylonjs-editor";

import { IFabMeshJson } from "../typings";

export interface IImportMeshParameters {
	json: IFabMeshJson;
	finalAssetsFolder: string;
	materialsMap: Map<number, PBRMaterial | null>;
	position?: Vector3;
}

export async function importMesh(editor: Editor, parameters: IImportMeshParameters) {
	const dest = join(parameters.finalAssetsFolder, basename(parameters.json.file));

	const rootNodes: Node[] = [];
	const result = await loadImportedSceneFile(editor.layout.preview.scene, dest);

	result?.meshes.forEach((mesh) => {
		mesh.material = parameters.materialsMap.get(parameters.json.material_index) ?? mesh.material;

		if (!mesh.parent) {
			rootNodes.push(mesh);
		}
	});

	result?.transformNodes.forEach((transformNode) => {
		if (!transformNode.parent) {
			rootNodes.push(transformNode);
		}
	});

	result?.lights.forEach((light) => {
		if (!light.parent) {
			rootNodes.push(light);
		}
	});

	if (parameters.position) {
		rootNodes.forEach((node) => {
			node["position"]?.addInPlace(parameters.position!);
		});
	}

	if (rootNodes.length === 1) {
		rootNodes[0].name = basename(parameters.json.file);
	}
}
