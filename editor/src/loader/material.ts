import { join } from "path/posix";
import { pathExistsSync } from "fs-extra";

import { PBRMaterial, Texture, Tools } from "babylonjs";

import { UniqueNumber } from "../tools/tools";

import { materialPropertyMap } from "./maps";
import { AssimpJSRuntime, IAssimpJSMaterialData } from "./types";

export function parseMaterial(runtime: AssimpJSRuntime, data: IAssimpJSMaterialData): PBRMaterial {
	const material = new PBRMaterial(Tools.RandomId(), runtime.scene);

	data.properties.forEach(async (p) => {
		switch (p.key) {
		case "?mat.name": material.name = p.value as string; break;

			// Textures
		case "$raw.Bump|file":
		case "$raw.DiffuseColor|file":
		case "$raw.AmbientColor|file":
		case "$raw.SpecularColor|file":
			if (typeof (p.value) === "string") {
				const map = materialPropertyMap[p.key];
				const texturePath = join(runtime.rootUrl, p.value.replace(/\\/g, "/"));

				if (map && pathExistsSync(texturePath)) {
					material[map] = new Texture(texturePath, runtime.scene);
				}
			}
			break;

			// Colors
		case "$raw.Diffuse":
		case "$clr.diffuse":
			if (Array.isArray(p.value)) {
				material.albedoColor.set(p.value[0], p.value[1], p.value[2]);
			}
			break;

		case "$raw.Specular":
		case "$clr.specular":
			if (Array.isArray(p.value)) {
				material.reflectivityColor.set(p.value[0], p.value[1], p.value[2]);
			}
			break;

		case "$raw.Ambient":
		case "$clr.ambient":
			if (Array.isArray(p.value)) {
				material.ambientColor.set(p.value[0], p.value[1], p.value[2]);
			}
			break;

		case "$raw.Emissive":
			if (Array.isArray(p.value)) {
				material.emissiveColor.set(p.value[0], p.value[1], p.value[2]);
			}
			break;

			// Factors
		case "$mat.shininess":
			if (typeof (p.value) === "number") {
				material.microSurface = p.value;
			}
			break;

		case "$mat.bumpscaling":
			if (typeof (p.value) === "number" && material.bumpTexture) {
				material.bumpTexture.level = p.value;
			}
			break;

		case "$mat.opacity":
			if (typeof (p.value) === "number") {
				material.alpha = p.value;
				material.alphaMode = PBRMaterial.MATERIAL_ALPHABLEND;
			}
			break;

		default:
			console.warn(`Unknown material property: ${p.key}`, p);
			break;
		}
	});

	material.metallic ??= 0;
	material.roughness ??= 1;

	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	runtime.container.materials.push(material);

	return material;
}
