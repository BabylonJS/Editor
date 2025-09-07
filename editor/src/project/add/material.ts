import { Scene, Tools, PBRMaterial, StandardMaterial, NodeMaterial } from "babylonjs";
import { SkyMaterial, GridMaterial, NormalMaterial, WaterMaterial } from "babylonjs-materials";

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

export function addGridMaterial(scene: Scene) {
	const material = new GridMaterial("New Grid Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	return material;
}

export function addNormalMaterial(scene: Scene) {
	const material = new NormalMaterial("New Normal Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	return material;
}

export function addWaterMaterial(scene: Scene) {
	const material = new WaterMaterial("New Water Material", scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();
	material.waveCount = 1;
	material.waveHeight = 0;

	return material;
}
