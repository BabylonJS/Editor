import { Scene, Tools, PBRMaterial, StandardMaterial, NodeMaterial } from "babylonjs";
import { SkyMaterial } from "babylonjs-materials";
import { UniqueNumber } from "../../tools/tools";

export function addPBRMaterial(scene: Scene) {
	const material = new PBRMaterial("New PBR Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	return material;
}

export function addStandardMaterial(scene: Scene) {
	const material = new StandardMaterial("New Standard Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	return material;
}

export function addNodeMaterial(scene: Scene) {   
	const material = new NodeMaterial("New Node Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();
	material.setToDefault();

	return material;
}

export function addSkyMaterial(scene: Scene) {
	const material = new SkyMaterial("New Sky Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	return material;
}
