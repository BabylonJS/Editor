import { CascadedShadowGenerator, Vector3 } from "babylonjs";

import { Editor } from "../../editor/main";

import { addFreeCamera } from "../add/camera";
import { addDirectionalLight } from "../add/light";
import { addBoxMesh, addGroundMesh } from "../add/mesh";

import { SceneLoadResult } from "./scene";

export function createNewSceneDefaultNodes(editor: Editor, result: SceneLoadResult) {
	const camera = addFreeCamera(editor);
	camera.speed = 200;
	camera.maxZ = 1500000;
	camera.position.set(500, 140, -500);
	camera.setTarget(new Vector3(0, 50, 0));

	const ground = addGroundMesh(editor);
	ground.name = "ground";

	const box = addBoxMesh(editor);
	box.name = "box";
	box.position.y = 50;

	const light = addDirectionalLight(editor);
	light.name = "sun";

	const sg = new CascadedShadowGenerator(4096, light);
	sg.lambda = 1;
	sg.bias = 0.01;
	sg.getShadowMap()?.renderList?.push(box);

	result.lights.push(light);
	result.cameras.push(camera);
	result.meshes.push(box, ground);
}
