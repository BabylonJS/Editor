import { Material } from "babylonjs";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { isAbstractMesh } from "../../../../tools/guards/nodes";

import { Editor } from "../../../main";

import { loadImportedMaterial } from "./import";

/**
 * Applies the material asset located at the given absolute path to the given object.
 * @param editor defines the reference to the editor.
 * @param object defines the reference to the object where to apply the material. The type of the object is tested to be an AbstractMesh.
 * @param absolutePath defines the absolute path to the .material asset file.
 */
export function applyMaterialAssetToObject(editor: Editor, object: any, absolutePath: string) {
	if (!isAbstractMesh(object)) {
		return;
	}

	loadImportedMaterial(object.getScene(), absolutePath).then((material) => {
		if (material) {
			applyMaterialToObject(editor, object, material);
		}
	});
}

/**
 * Applies the given material to the given object.
 * @param editor defines the reference to the editor.
 * @param object defines the reference to the object where to apply the material. The type of the object is tested to be an AbstractMesh.
 * @param material defines the reference to the material instance to apply on the object.
 */
export function applyMaterialToObject(editor: Editor, object: any, material: Material) {
	if (!isAbstractMesh(object)) {
		return;
	}

	const oldMaterial = object.material;

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			object.material = oldMaterial;
			object.getLODLevels().forEach((lod) => {
				if (lod.mesh) {
					lod.mesh.material = oldMaterial;
				}
			});
		},
		redo: () => {
			object.material = material;
			object.getLODLevels().forEach((lod) => {
				if (lod.mesh) {
					lod.mesh.material = material;
				}
			});
		},
		onLost: () => {
			const bindedMeshes = material.getBindedMeshes();
			if (!bindedMeshes.length) {
				material.dispose();
			}
		},
	});

	editor.layout.inspector.forceUpdate();
}
