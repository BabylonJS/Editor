import { Texture as BabylonTexture } from "@babylonjs/core/Materials/Textures/texture";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Material as BabylonMaterial } from "@babylonjs/core/Materials/material";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";

import type { IMaterialFactory, IData, IMaterial, ITexture, IImage } from "../types";

/**
 * Factory for creating materials and textures from Three.js JSON data
 */
export class MaterialFactory implements IMaterialFactory {
	private _scene: Scene;
	private _data: IData;
	private _rootUrl: string;
	constructor(scene: Scene, data: IData, rootUrl: string) {
		this._scene = scene;
		this._data = data;
		this._rootUrl = rootUrl;
	}

	/**
	 * Create a texture from material ID (for ParticleSystem - no material needed)
	 */
	public createTexture(materialId: string): BabylonTexture {
		const textureData = this._resolveTextureData(materialId);
		if (!textureData) {
			return new BabylonTexture(materialId, this._scene);
		}

		const { texture, image } = textureData;
		const textureUrl = this._buildTextureUrl(image);
		return this._createTextureFromData(textureUrl, texture);
	}

	/**
	 * Get blend mode from material blending value
	 */
	public getBlendMode(materialId: string): number | undefined {
		const material = this._data.materials?.find((m: any) => m.uuid === materialId);

		if (material?.blending === undefined) {
			return undefined;
		}

		const blendModeMap: Record<number, number> = {
			0: Constants.ALPHA_DISABLE, // NoBlending
			1: Constants.ALPHA_COMBINE, // NormalBlending
			2: Constants.ALPHA_ADD, // AdditiveBlending
		};

		return blendModeMap[material.blending];
	}

	/**
	 * Resolves material, texture, and image data from material ID
	 */
	private _resolveTextureData(materialId: string): { material: IMaterial; texture: ITexture; image: IImage } | null {
		if (!this._hasRequiredData()) {
			Tools.Warn(`Missing materials/textures/images data for material ${materialId}`);
			return null;
		}

		const material = this._findMaterial(materialId);
		if (!material || !material.map) {
			return null;
		}

		const texture = this._findTexture(material.map);
		if (!texture || !texture.image) {
			return null;
		}

		const image = this._findImage(texture.image);
		if (!image || !image.url) {
			return null;
		}

		return { material, texture, image };
	}

	/**
	 * Checks if required JSON data is available
	 */
	private _hasRequiredData(): boolean {
		return !!(this._data.materials && this._data.textures && this._data.images);
	}

	/**
	 * Finds material by UUID
	 */
	private _findMaterial(materialId: string): IMaterial | null {
		const material = this._data.materials?.find((m) => m.uuid === materialId);
		if (!material) {
			Tools.Warn(`Material not found: ${materialId}`);
			return null;
		}
		return material;
	}

	/**
	 * Finds texture by UUID
	 */
	private _findTexture(textureId: string): ITexture | null {
		const texture = this._data.textures?.find((t) => t.uuid === textureId);
		if (!texture) {
			Tools.Warn(`Texture not found: ${textureId}`);
			return null;
		}
		return texture;
	}

	/**
	 * Finds image by UUID
	 */
	private _findImage(imageId: string): IImage | null {
		const image = this._data.images?.find((img) => img.uuid === imageId);
		if (!image) {
			Tools.Warn(`Image not found: ${imageId}`);
			return null;
		}
		return image;
	}

	/**
	 * Builds texture URL from image data
	 */
	private _buildTextureUrl(image: IImage): string {
		if (!image.url) {
			return "";
		}
		const isBase64 = image.url.startsWith("data:");
		return isBase64 ? image.url : Tools.GetAssetUrl(this._rootUrl + image.url);
	}

	/**
	 * Applies texture properties from  texture data to Babylon.js texture
	 */
	private _applyTextureProperties(babylonTexture: BabylonTexture, texture: ITexture): void {
		if (texture.wrapU !== undefined) {
			babylonTexture.wrapU = texture.wrapU;
		}
		if (texture.wrapV !== undefined) {
			babylonTexture.wrapV = texture.wrapV;
		}
		if (texture.uScale !== undefined) {
			babylonTexture.uScale = texture.uScale;
		}
		if (texture.vScale !== undefined) {
			babylonTexture.vScale = texture.vScale;
		}
		if (texture.uOffset !== undefined) {
			babylonTexture.uOffset = texture.uOffset;
		}
		if (texture.vOffset !== undefined) {
			babylonTexture.vOffset = texture.vOffset;
		}
		if (texture.coordinatesIndex !== undefined) {
			babylonTexture.coordinatesIndex = texture.coordinatesIndex;
		}
		if (texture.uAng !== undefined) {
			babylonTexture.uAng = texture.uAng;
		}
	}

	/**
	 * Creates Babylon.js texture from  texture data
	 */
	private _createTextureFromData(textureUrl: string, texture: ITexture): BabylonTexture {
		const samplingMode = texture.samplingMode ?? BabylonTexture.TRILINEAR_SAMPLINGMODE;

		const babylonTexture = new BabylonTexture(textureUrl, this._scene, {
			noMipmap: !texture.generateMipmaps,
			invertY: texture.flipY !== false,
			samplingMode,
		});

		this._applyTextureProperties(babylonTexture, texture);
		return babylonTexture;
	}

	/**
	 * Create a material from material ID, or default PBR material when materialId is undefined (like default geometry).
	 */
	public createMaterial(materialId: string | undefined, name: string): PBRMaterial {
		if (!materialId) {
			return new PBRMaterial(name + "_material", this._scene);
		}
		const textureData = this._resolveTextureData(materialId);
		if (!textureData) {
			return new PBRMaterial(name + "_material", this._scene);
		}

		const { material, texture, image } = textureData;
		const materialType = material.type || "MeshStandardMaterial";

		const textureUrl = this._buildTextureUrl(image);
		const babylonTexture = this._createTextureFromData(textureUrl, texture);
		const materialColor = material.color || new Color3(1, 1, 1);

		if (materialType === "MeshBasicMaterial") {
			return this._createUnlitMaterial(name, material, babylonTexture, materialColor);
		}

		// Create PBR material for other material types
		// Note: Vertex colors are automatically used by PBR materials if mesh has vertex colors
		// The VERTEXCOLOR define is set automatically based on mesh.isVerticesDataPresent(VertexBuffer.ColorKind)
		const pbrMaterial = new PBRMaterial(name + "_material", this._scene);
		pbrMaterial.albedoTexture = babylonTexture;
		pbrMaterial.albedoColor = materialColor;

		this._applyTransparency(pbrMaterial, material, babylonTexture);
		this._applyDepthWrite(pbrMaterial, material);
		this._applySideSettings(pbrMaterial, material);
		this._applyBlendMode(pbrMaterial, material);

		return pbrMaterial;
	}

	/**
	 * Create a material for SolidParticleSystem with unlit enabled (so vertex colors show as defined).
	 * Vertex colors need to be in linear space (use toLinearSpaceToRef on particle.color).
	 */
	public createMaterialForSPS(materialId: string | undefined, name: string): PBRMaterial {
		const material = this.createMaterial(materialId, name);
		material.unlit = true;
		return material;
	}

	/**
	 * Creates unlit material (MeshBasicMaterial equivalent)
	 */
	private _createUnlitMaterial(name: string, material: IMaterial, texture: BabylonTexture, color: Color3): PBRMaterial {
		const unlitMaterial = new PBRMaterial(name + "_material", this._scene);

		unlitMaterial.unlit = true;
		unlitMaterial.albedoColor = color;
		unlitMaterial.albedoTexture = texture;
		// Note: Vertex colors are automatically used by PBR materials if mesh has vertex colors

		this._applyTransparency(unlitMaterial, material, texture);
		this._applyDepthWrite(unlitMaterial, material);
		this._applySideSettings(unlitMaterial, material);
		this._applyBlendMode(unlitMaterial, material);

		return unlitMaterial;
	}

	/**
	 * Applies transparency settings to material
	 */
	private _applyTransparency(material: PBRMaterial, Material: IMaterial, texture: BabylonTexture): void {
		if (Material.transparent) {
			material.transparencyMode = BabylonMaterial.MATERIAL_ALPHABLEND;
			material.needDepthPrePass = false;
			texture.hasAlpha = true;
			material.useAlphaFromAlbedoTexture = true;
		} else {
			material.transparencyMode = BabylonMaterial.MATERIAL_OPAQUE;
			material.alpha = 1.0;
		}
	}

	/**
	 * Applies depth write settings to material
	 */
	private _applyDepthWrite(material: PBRMaterial, Material: IMaterial): void {
		if (Material.depthWrite !== undefined) {
			material.disableDepthWrite = !Material.depthWrite;
		} else {
			material.disableDepthWrite = true;
		}
	}

	/**
	 * Applies side orientation settings to material
	 */
	private _applySideSettings(material: PBRMaterial, Material: IMaterial): void {
		material.backFaceCulling = false;

		if (Material.side !== undefined) {
			material.sideOrientation = Material.side;
		}
	}

	/**
	 * Applies blend mode to material
	 */
	private _applyBlendMode(material: PBRMaterial, Material: IMaterial): void {
		if (Material.blending === undefined) {
			return;
		}

		const blendModeMap: Record<number, number> = {
			0: Constants.ALPHA_DISABLE, // NoBlending
			1: Constants.ALPHA_COMBINE, // NormalBlending
			2: Constants.ALPHA_ADD, // AdditiveBlending
		};

		const alphaMode = blendModeMap[Material.blending];
		if (alphaMode !== undefined) {
			material.alphaMode = alphaMode;
		}
	}
}
