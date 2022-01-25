import { basename, extname, join } from "path";
import { pathExistsSync, writeFileSync } from "fs-extra";

import { INumberDictionary, Undefinable } from "../../../../../shared/types";

import { FBXReaderNode } from "fbx-parser";
import { Texture, Scene, StandardMaterial, Color3 } from "babylonjs";

import { IFBXLoaderRuntime } from "../loader";
import { IFBXConnections } from "../connections";

export class FBXMaterial {
	private static _SupportedTextureTypes: string[] = [".png", ".jpg", ".jpeg", ".bmp"];

	/**
	 * Parses all available materials in the FBX file.
	 * @param runtime defines the reference to the current FBX runtime.
	 */
	public static ParseMaterials(runtime: IFBXLoaderRuntime): void {
		const videos = this._ParseVideos(runtime.scene, runtime.objects, runtime.rootUrl, runtime.writeTextures);
		const textures = this._ParseTextures(runtime.objects, runtime.connections, videos);

		const materials = runtime.objects.nodes("Material");
        for (const m of materials) {
			const id = m.prop(0, "number")!;
			const name = m.prop(1, "string")!;

            const material = new StandardMaterial(name, runtime.scene);
			material.id = id.toString();

			runtime.result.materials.push(material);

			const properties = m.node("Properties70")?.nodes("P") ?? [];
			properties.forEach((p) => {
				const type = p.prop(0, "string");
				switch (type) {
					case "Diffuse":
					case "DiffuseColor":
						material.diffuseColor = new Color3(p.prop(4, "number"), p.prop(5, "number"), p.prop(6, "number"));
						break;

					case "Specular":
					case "SpecularColor":
						material.specularColor = new Color3(p.prop(4, "number"), p.prop(5, "number"), p.prop(6, "number"));
						break;

					case "Ambient":
					case "AmbientColor":
						material.ambientColor = new Color3(p.prop(4, "number"), p.prop(5, "number"), p.prop(6, "number"));
						break;

					case "Emissive":
					case "EmissiveColor":
						material.emissiveColor = new Color3(p.prop(4, "number"), p.prop(5, "number"), p.prop(6, "number"));
						break;
				}
			});

			const relationships = runtime.connections.get(id);
			relationships?.children?.forEach((c) => {
				const texture = textures[c.id];
				if (!texture) {
					return;
				}

				const type = c.relationship;
				switch (type) {
					case "DiffuseColor":
					case "Maya|TEX_color_map":
						material.diffuseTexture = texture;
						break;

					case "Bump":
					case "NormalMap":
					case "Maya|TEX_normal_map":
						material.bumpTexture = texture;
						break;

					case "SpecularColor":
						material.specularTexture = texture;
						break;

					case "Maya|TEX_ao_map":
						material.ambientTexture = texture;
						break;
				}
			});

			runtime.cachedMaterials[id] = material;
        }
	}

	/**
	 * Configures all the given textures.
	 */
	private static _ParseTextures(objects: FBXReaderNode, connections: Map<number, IFBXConnections>, videos: INumberDictionary<Texture>): INumberDictionary<Texture> {
		const result: INumberDictionary<Texture> = {};
		const textures = objects.nodes("Texture");

        for (const t of textures) {
            const id = t.prop(0, "number")!;
            const videoId = connections.get(id)?.children[0]?.id;
            if (videoId === undefined) {
                continue;
            }

            const video = videos[videoId];
            if (!video) {
                continue;
            }

			result[id] = video;

			// Configure texture
			const modelUVTranslation = t.node("ModelUVTranslation");
			if (modelUVTranslation) {
				video.uOffset = modelUVTranslation.prop(0, "number") ?? 0;
				video.vOffset = modelUVTranslation.prop(1, "number") ?? 0;
			}

			const modelUVScaling = t.node("ModelUVScaling");
			if (modelUVScaling) {
				video.uScale = modelUVScaling.prop(0, "number") ?? 1;
				video.vScale = modelUVScaling.prop(1, "number") ?? 1;
			}
        }

		return result;
	}

	/**
	 * Parses all the available Video FBX nodes and returns the created textures dictionary.
	 */
	private static _ParseVideos(scene: Scene, objects: FBXReaderNode, rootUrl: string, writeTextures: boolean): INumberDictionary<Texture> {
		const videos = objects.nodes("Video");
		const result: INumberDictionary<Texture> = {};

		for (const v of videos) {
			let filePath = v.node("RelativeFilename")?.prop(0, "string") ?? v.node("Filename")?.prop(0, "string");
			if (!filePath) {
				continue;
			}

			filePath = filePath.replace(/\\/g, "/");

			const extension = extname(filePath).toLowerCase();
			if (this._SupportedTextureTypes.indexOf(extension) === -1) {
				continue;
			}

			const id = v.prop(0, "number")!;
			const useMipMap = v.node("UseMipMap")?.prop(0) ?? 0;

			const fileName = basename(filePath);
			let fileUrl = join(rootUrl, fileName);

			const content = v.node("Content")?.prop(0) as Undefinable<string | Buffer>;
			if (!Buffer.isBuffer(content)) {
				continue;
			}

			if (!content.length) {
				if (!pathExistsSync(fileUrl)) {
					continue;
				}
			}

			if (content.length) {
				if (writeTextures) {
					writeFileSync(fileUrl, Buffer.from(content), { encoding: "binary" });
				} else {
					const blob = new Blob([content]);
					fileUrl = URL.createObjectURL(blob);
				}
			}
			
			const texture = new Texture(fileUrl, scene, !useMipMap, undefined, undefined, undefined, () => {
				if (!writeTextures) {
					URL.revokeObjectURL(fileUrl);
				}
			});
			
			if (!writeTextures) {
				texture.onLoadObservable.addOnce(() => URL.revokeObjectURL(fileUrl));
			}

			result[id] = texture;
		}

		return result;
	}
}