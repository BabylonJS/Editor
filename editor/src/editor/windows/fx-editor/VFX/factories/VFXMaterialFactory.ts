import type { Nullable } from "@babylonjs/core/types";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Material } from "@babylonjs/core/Materials/material";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Tools } from "@babylonjs/core/Misc/tools";
import type { IVFXMaterialFactory } from "../types/factories";
import type { VFXParseContext } from "../types/context";
import type { VFXLoaderOptions } from "../types/loader";
import { VFXLogger } from "../loggers/VFXLogger";
import type { QuarksTexture } from "../types/quarksTypes";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Factory for creating materials and textures from Three.js JSON data
 */
export class VFXMaterialFactory implements IVFXMaterialFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;

	constructor(context: VFXParseContext) {
		this._context = context;
		this._logger = new VFXLogger("[VFXMaterialFactory]");
	}

	/**
	 * Create a texture from material ID (for ParticleSystem - no material needed)
	 */
	public createTexture(materialId: string): Nullable<Texture> {
		const { jsonData, scene, rootUrl, options } = this._context;

		if (!jsonData.materials || !jsonData.textures || !jsonData.images) {
			this._logger.warn(`Missing materials/textures/images data for material ${materialId}`, options);
			return null;
		}

		// Find material
		const material = jsonData.materials.find((m) => m.uuid === materialId);
		if (!material) {
			this._logger.warn(`Material not found: ${materialId}`, options);
			return null;
		}
		if (!material.map) {
			this._logger.warn(`Material ${materialId} has no texture map`, options);
			return null;
		}

		// Find texture
		const texture = jsonData.textures.find((t) => t.uuid === material.map);
		if (!texture) {
			this._logger.warn(`Texture not found: ${material.map}`, options);
			return null;
		}
		if (!texture.image) {
			this._logger.warn(`Texture ${material.map} has no image`, options);
			return null;
		}

		// Find image
		const image = jsonData.images.find((img) => img.uuid === texture.image);
		if (!image) {
			this._logger.warn(`Image not found: ${texture.image}`, options);
			return null;
		}

		// Create texture URL from image data
		let textureUrl: string;
		if (image.url) {
			textureUrl = Tools.GetAssetUrl(rootUrl + image.url);
		} else if (image.data) {
			// Base64 embedded texture
			textureUrl = `data:image/${image.format || "png"};base64,${image.data}`;
		} else {
			this._logger.warn(`Image ${texture.image} has neither URL nor data`, options);
			return null;
		}

		// Create texture using helper method
		return this._createTextureFromData(textureUrl, texture, scene, options);
	}

	/**
	 * Helper method to create texture from texture data
	 */
	private _createTextureFromData(textureUrl: string, texture: QuarksTexture, scene: Scene, _options?: VFXLoaderOptions): Texture {
		// Determine sampling mode from texture filters
		let samplingMode = Texture.TRILINEAR_SAMPLINGMODE; // Default
		if (texture.minFilter !== undefined) {
			if (texture.minFilter === 1008 || texture.minFilter === 1009) {
				samplingMode = Texture.TRILINEAR_SAMPLINGMODE;
			} else if (texture.minFilter === 1007 || texture.minFilter === 1006) {
				samplingMode = Texture.BILINEAR_SAMPLINGMODE;
			} else {
				samplingMode = Texture.NEAREST_SAMPLINGMODE;
			}
		} else if (texture.magFilter !== undefined) {
			if (texture.magFilter === 1006) {
				samplingMode = Texture.BILINEAR_SAMPLINGMODE;
			} else {
				samplingMode = Texture.NEAREST_SAMPLINGMODE;
			}
		}

		// Create texture with proper settings
		const babylonTexture = new Texture(textureUrl, scene, {
			noMipmap: !texture.generateMipmaps,
			invertY: texture.flipY !== false, // Three.js flipY defaults to true
			samplingMode: samplingMode,
		});

		// Configure texture properties from Three.js JSON
		if (texture.wrap && Array.isArray(texture.wrap)) {
			const wrapU = texture.wrap[0] === 1000 ? Texture.WRAP_ADDRESSMODE : texture.wrap[0] === 1001 ? Texture.CLAMP_ADDRESSMODE : Texture.MIRROR_ADDRESSMODE;
			const wrapV = texture.wrap[1] === 1000 ? Texture.WRAP_ADDRESSMODE : texture.wrap[1] === 1001 ? Texture.CLAMP_ADDRESSMODE : Texture.MIRROR_ADDRESSMODE;
			babylonTexture.wrapU = wrapU;
			babylonTexture.wrapV = wrapV;
		}

		if (texture.repeat && Array.isArray(texture.repeat)) {
			babylonTexture.uScale = texture.repeat[0] || 1;
			babylonTexture.vScale = texture.repeat[1] || 1;
		}

		if (texture.offset && Array.isArray(texture.offset)) {
			babylonTexture.uOffset = texture.offset[0] || 0;
			babylonTexture.vOffset = texture.offset[1] || 0;
		}

		if (texture.channel !== undefined && typeof texture.channel === "number") {
			babylonTexture.coordinatesIndex = texture.channel;
		}

		if (texture.rotation !== undefined) {
			babylonTexture.uAng = texture.rotation;
		}

		return babylonTexture;
	}

	/**
	 * Create a material with texture from material ID
	 */
	public createMaterial(materialId: string, name: string): Nullable<PBRMaterial> {
		const { jsonData, scene, rootUrl, options } = this._context;

		this._logger.log(`Creating material for ID: ${materialId}, name: ${name}`, options);
		if (!jsonData.materials || !jsonData.textures || !jsonData.images) {
			this._logger.warn(`Missing materials/textures/images data for material ${materialId}`, options);
			return null;
		}

		// Find material
		const material = jsonData.materials.find((m) => m.uuid === materialId);
		if (!material) {
			this._logger.warn(`Material not found: ${materialId}`, options);
			return null;
		}
		if (!material.map) {
			this._logger.warn(`Material ${materialId} has no texture map`, options);
			return null;
		}

		const materialType = material.type || "MeshStandardMaterial";
		this._logger.log(`Found material: type=${materialType}, uuid=${material.uuid}, transparent=${material.transparent}, blending=${material.blending}`, options);

		// Find texture
		const texture = jsonData.textures.find((t) => t.uuid === material.map);
		if (!texture) {
			this._logger.warn(`Texture not found: ${material.map}`, options);
			return null;
		}
		if (!texture.image) {
			this._logger.warn(`Texture ${material.map} has no image`, options);
			return null;
		}

		this._logger.log(`Found texture: ${JSON.stringify({ uuid: texture.uuid, image: texture.image })}`, options);

		// Find image
		const image = jsonData.images.find((img) => img.uuid === texture.image);
		if (!image) {
			this._logger.warn(`Image not found: ${texture.image}`, options);
			return null;
		}

		const imageInfo: string[] = [];
		if (image.url) {
			const urlParts = image.url.split("/");
			let filename = urlParts[urlParts.length - 1] || image.url;
			// If filename looks like base64 data (very long), truncate it
			if (filename.length > 50) {
				filename = filename.substring(0, 20) + "...";
			}
			imageInfo.push(`file: ${filename}`);
		}
		if (image.data) {
			imageInfo.push("embedded");
		}
		if (image.format) {
			imageInfo.push(`format: ${image.format}`);
		}
		this._logger.log(`Found image: ${imageInfo.join(", ") || "unknown"}`, options);

		// Create texture URL from image data
		let textureUrl: string;
		if (image.url) {
			textureUrl = Tools.GetAssetUrl(rootUrl + image.url);
			// Extract filename from URL for logging
			const urlParts = image.url.split("/");
			let filename = urlParts[urlParts.length - 1] || image.url;
			// If filename looks like base64 data (very long), truncate it
			if (filename.length > 50) {
				filename = filename.substring(0, 20) + "...";
			}
			this._logger.log(`Using external texture: ${filename}`, options);
		} else if (image.data) {
			// Base64 embedded texture
			textureUrl = `data:image/${image.format || "png"};base64,${image.data}`;
			this._logger.log(`Using base64 embedded texture (format: ${image.format || "png"})`, options);
		} else {
			this._logger.warn(`Image ${texture.image} has neither URL nor data`, options);
			return null;
		}

		// Determine sampling mode from texture filters
		let samplingMode = Texture.TRILINEAR_SAMPLINGMODE; // Default
		if (texture.minFilter !== undefined) {
			if (texture.minFilter === 1008 || texture.minFilter === 1009) {
				samplingMode = Texture.TRILINEAR_SAMPLINGMODE;
			} else if (texture.minFilter === 1007 || texture.minFilter === 1006) {
				samplingMode = Texture.BILINEAR_SAMPLINGMODE;
			} else {
				samplingMode = Texture.NEAREST_SAMPLINGMODE;
			}
		} else if (texture.magFilter !== undefined) {
			if (texture.magFilter === 1006) {
				samplingMode = Texture.BILINEAR_SAMPLINGMODE;
			} else {
				samplingMode = Texture.NEAREST_SAMPLINGMODE;
			}
		}

		// Create texture with proper settings
		const babylonTexture = new Texture(textureUrl, scene, {
			noMipmap: !texture.generateMipmaps,
			invertY: texture.flipY !== false, // Three.js flipY defaults to true
			samplingMode: samplingMode,
		});

		// Configure texture properties from Three.js JSON
		// wrap: [1001, 1001] = WRAP_ADDRESSMODE (repeat)
		if (texture.wrap && Array.isArray(texture.wrap)) {
			// Three.js wrap: 1000 = RepeatWrapping, 1001 = ClampToEdgeWrapping, 1002 = MirroredRepeatWrapping
			// Babylon.js: WRAP_ADDRESSMODE = 0, CLAMP_ADDRESSMODE = 1, MIRROR_ADDRESSMODE = 2
			const wrapU = texture.wrap[0] === 1000 ? Texture.WRAP_ADDRESSMODE : texture.wrap[0] === 1001 ? Texture.CLAMP_ADDRESSMODE : Texture.MIRROR_ADDRESSMODE;
			const wrapV = texture.wrap[1] === 1000 ? Texture.WRAP_ADDRESSMODE : texture.wrap[1] === 1001 ? Texture.CLAMP_ADDRESSMODE : Texture.MIRROR_ADDRESSMODE;
			babylonTexture.wrapU = wrapU;
			babylonTexture.wrapV = wrapV;
		}

		// repeat: [1, 1] -> uScale, vScale
		if (texture.repeat && Array.isArray(texture.repeat)) {
			babylonTexture.uScale = texture.repeat[0] || 1;
			babylonTexture.vScale = texture.repeat[1] || 1;
		}

		// offset: [0, 0] -> uOffset, vOffset
		if (texture.offset && Array.isArray(texture.offset)) {
			babylonTexture.uOffset = texture.offset[0] || 0;
			babylonTexture.vOffset = texture.offset[1] || 0;
		}

		// channel: 0 -> coordinatesIndex
		if (texture.channel !== undefined && typeof texture.channel === "number") {
			babylonTexture.coordinatesIndex = texture.channel;
		}

		// rotation: 0 -> uAng (rotation in radians)
		if (texture.rotation !== undefined) {
			babylonTexture.uAng = texture.rotation;
		}

		// Parse color from Three.js material (default is white 0xffffff)
		let materialColor = new Color3(1, 1, 1);
		if (material.color !== undefined) {
			// Three.js color is stored as hex number (e.g., 16777215 = 0xffffff) or hex string
			let colorHex: number;
			if (typeof material.color === "number") {
				colorHex = material.color;
			} else if (typeof material.color === "string") {
				colorHex = parseInt((material.color as string).replace("#", ""), 16);
			} else {
				colorHex = 0xffffff;
			}
			const r = ((colorHex >> 16) & 0xff) / 255;
			const g = ((colorHex >> 8) & 0xff) / 255;
			const b = (colorHex & 0xff) / 255;
			materialColor = new Color3(r, g, b);
			this._logger.log(`Parsed material color: R=${r.toFixed(2)}, G=${g.toFixed(2)}, B=${b.toFixed(2)}`, options);
		}

		// Handle different Three.js material types
		if (materialType === "MeshBasicMaterial") {
			// MeshBasicMaterial: Use PBRMaterial with unlit = true (equivalent to UnlitMaterial)
			const unlitMaterial = new PBRMaterial(name + "_material", scene);
			unlitMaterial.unlit = true;
			unlitMaterial.albedoColor = materialColor;
			unlitMaterial.albedoTexture = babylonTexture;

			// Transparency
			if (material.transparent !== undefined && material.transparent) {
				unlitMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
				unlitMaterial.needDepthPrePass = false;
				babylonTexture.hasAlpha = true;
				unlitMaterial.useAlphaFromAlbedoTexture = true;
				this._logger.log(`Material is transparent (transparencyMode: ALPHABLEND, alphaMode: COMBINE)`, options);
			} else {
				unlitMaterial.transparencyMode = Material.MATERIAL_OPAQUE;
				unlitMaterial.alpha = 1.0;
			}

			// Depth write
			if (material.depthWrite !== undefined) {
				unlitMaterial.disableDepthWrite = !material.depthWrite;
				this._logger.log(`Set disableDepthWrite: ${!material.depthWrite}`, options);
			} else {
				unlitMaterial.disableDepthWrite = true; // Default to false depthWrite = true disableDepthWrite
			}

			// Double sided
			unlitMaterial.backFaceCulling = false;

			// Side orientation
			if (material.side !== undefined) {
				// Three.js: 0 = FrontSide, 1 = BackSide, 2 = DoubleSide
				// Babylon.js: 0 = Front, 1 = Back, 2 = Double
				unlitMaterial.sideOrientation = material.side;
				this._logger.log(`Set sideOrientation: ${material.side}`, options);
			}

			// Blend mode
			if (material.blending !== undefined) {
				if (material.blending === 2) {
					// Additive blending (Three.js AdditiveBlending)
					unlitMaterial.alphaMode = Constants.ALPHA_ADD;
					this._logger.log("Set blend mode: ADDITIVE", options);
				} else if (material.blending === 1) {
					// Normal blending (Three.js NormalBlending)
					unlitMaterial.alphaMode = Constants.ALPHA_COMBINE;
					this._logger.log("Set blend mode: NORMAL", options);
				} else if (material.blending === 0) {
					// No blending (Three.js NoBlending)
					unlitMaterial.alphaMode = Constants.ALPHA_DISABLE;
					this._logger.log("Set blend mode: NO_BLENDING", options);
				}
			}

			this._logger.log(`Using MeshBasicMaterial: PBRMaterial with unlit=true, albedoTexture`, options);
			this._logger.log(`Material created successfully: ${name}_material`, options);
			return unlitMaterial;
		} else {
			return new PBRMaterial(name + "_material", scene);
		}
	}
}
