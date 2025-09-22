import { Mesh, Tools } from "babylonjs";

import { Editor } from "../../editor/main";

import { UniqueNumber } from "../tools";

import { getCollisionMeshFor } from "./collision";

export function createMeshInstance(editor: Editor, mesh: Mesh) {
	const instance = mesh.createInstance(`${mesh.name} (Mesh Instance)`);
	instance.id = Tools.RandomId();
	instance.uniqueId = UniqueNumber.Get();
	instance.parent = mesh.parent;
	instance.position.copyFrom(mesh.position);
	instance.rotation.copyFrom(mesh.rotation);
	instance.scaling.copyFrom(mesh.scaling);
	instance.rotationQuaternion = mesh.rotationQuaternion?.clone() ?? null;
	instance.isVisible = mesh.isVisible;
	instance.setEnabled(mesh.isEnabled());

	const collisionMesh = getCollisionMeshFor(instance.sourceMesh);
	collisionMesh?.updateInstances(instance.sourceMesh);

	const lights = editor.layout.preview.scene.lights;
	const shadowMaps = lights.map((light) => light.getShadowGenerator()?.getShadowMap()).filter((s) => s);

	shadowMaps.forEach((shadowMap) => {
		if (shadowMap?.renderList?.includes(mesh)) {
			shadowMap.renderList.push(instance);
		}
	});

	return instance;
}
