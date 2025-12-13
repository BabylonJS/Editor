import { Nullable, Texture, PBRMaterial, Material, Constants, Tools, Scene, Color3 } from "babylonjs";
import type { IVFXMaterialFactory } from "../types/factories";
import { VFXLogger } from "../loggers/VFXLogger";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXData } from "../types/hierarchy";
import type { VFXMaterial, VFXTexture, VFXImage } from "../types/resources";

/**
 * Factory for creating materials and textures from Three.js JSON data
 */
export class VFXMaterialFactory implements IVFXMaterialFactory {
	private _logger: VFXLogger;
	private _scene: Scene;
	private _vfxData: VFXData;
	private _rootUrl: string;

	constructor(scene: Scene, vfxData: VFXData, rootUrl: string, options: VFXLoaderOptions) {
		this._scene = scene;
		this._vfxData = vfxData;
		this._rootUrl = rootUrl;
		this._logger = new VFXLogger("[VFXMaterialFactory]", options);
	}

	/**
	 * Create a texture from material ID (for ParticleSystem - no material needed)
	 */
	public createTexture(materialId: string): Nullable<Texture> {
		const textureData = this._resolveTextureData(materialId);
		if (!textureData) {
			return null;
		}

		const { texture, image } = textureData;
		const textureUrl = this._buildTextureUrl(image);
		return this._createTextureFromData(textureUrl, texture);
	}

	/**
	 * Get blend mode from material blending value
	 */
	public getBlendMode(materialId: string): number | undefined {
		const material = this._vfxData.materials?.find((m: any) => m.uuid === materialId);

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
	private _resolveTextureData(materialId: string): { material: VFXMaterial; texture: VFXTexture; image: VFXImage } | null {
		if (!this._hasRequiredData()) {
			this._logger.warn(`Missing materials/textures/images data for material ${materialId}`);
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
		return !!(this._vfxData.materials && this._vfxData.textures && this._vfxData.images);
	}

	/**
	 * Finds material by UUID
	 */
	private _findMaterial(materialId: string): VFXMaterial | null {
		const material = this._vfxData.materials?.find((m) => m.uuid === materialId);
		if (!material) {
			this._logger.warn(`Material not found: ${materialId}`);
			return null;
		}
		return material;
	}

	/**
	 * Finds texture by UUID
	 */
	private _findTexture(textureId: string): VFXTexture | null {
		const texture = this._vfxData.textures?.find((t) => t.uuid === textureId);
		if (!texture) {
			this._logger.warn(`Texture not found: ${textureId}`);
			return null;
		}
		return texture;
	}

	/**
	 * Finds image by UUID
	 */
	private _findImage(imageId: string): VFXImage | null {
		const image = this._vfxData.images?.find((img) => img.uuid === imageId);
		if (!image) {
			this._logger.warn(`Image not found: ${imageId}`);
			return null;
		}
		return image;
	}

	/**
	 * Builds texture URL from image data
	 */
	private _buildTextureUrl(image: VFXImage): string {
		if (!image.url) {
			return "";
		}
		const isBase64 = image.url.startsWith("data:");
		return isBase64 ? image.url : Tools.GetAssetUrl(this._rootUrl + image.url);
	}

	/**
	 * Applies texture properties from VFX texture data to Babylon.js texture
	 */
	private _applyTextureProperties(babylonTexture: Texture, texture: VFXTexture): void {
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
	 * Creates Babylon.js texture from VFX texture data
	 */
	private _createTextureFromData(textureUrl: string, texture: VFXTexture): Texture {
		const samplingMode = texture.samplingMode ?? Texture.TRILINEAR_SAMPLINGMODE;

		const babylonTexture = new Texture(textureUrl, this._scene, {
			noMipmap: !texture.generateMipmaps,
			invertY: texture.flipY !== false,
			samplingMode,
		});

		this._applyTextureProperties(babylonTexture, texture);
		return babylonTexture;
	}

	/**
	 * Create a material with texture from material ID
	 */
	public createMaterial(materialId: string, name: string): Nullable<PBRMaterial> {
		this._logger.log(`Creating material for ID: ${materialId}, name: ${name}`);

		const textureData = this._resolveTextureData(materialId);
		if (!textureData) {
			return null;
		}

		const { material, texture, image } = textureData;
		const materialType = material.type || "MeshStandardMaterial";

		this._logger.log(`Found material: type=${materialType}, uuid=${material.uuid}, transparent=${material.transparent}, blending=${material.blending}`);
		this._logger.log(`Found texture: ${JSON.stringify({ uuid: texture.uuid, image: texture.image })}`);
		const imageInfo = image.url ? (image.url.split("/").pop() || image.url).substring(0, 50) : "unknown";
		this._logger.log(`Found image: file: ${imageInfo}`);

		const textureUrl = this._buildTextureUrl(image);
		const babylonTexture = this._createTextureFromData(textureUrl, texture);
		const materialColor = material.color || new Color3(1, 1, 1);

		if (materialType === "MeshBasicMaterial") {
			return this._createUnlitMaterial(name, material, babylonTexture, materialColor);
		}

		return new PBRMaterial(name + "_material", this._scene);
	}

	/**
	 * Creates unlit material (MeshBasicMaterial equivalent)
	 */
	private _createUnlitMaterial(name: string, material: VFXMaterial, texture: Texture, color: Color3): PBRMaterial {
		const unlitMaterial = new PBRMaterial(name + "_material", this._scene);

		unlitMaterial.unlit = true;
		unlitMaterial.albedoColor = color;
		unlitMaterial.albedoTexture = texture;

		this._applyTransparency(unlitMaterial, material, texture);
		this._applyDepthWrite(unlitMaterial, material);
		this._applySideSettings(unlitMaterial, material);
		this._applyBlendMode(unlitMaterial, material);

		this._logger.log(`Using MeshBasicMaterial: PBRMaterial with unlit=true, albedoTexture`);
		this._logger.log(`Material created successfully: ${name}_material`);

		return unlitMaterial;
	}

	/**
	 * Applies transparency settings to material
	 */
	private _applyTransparency(material: PBRMaterial, vfxMaterial: VFXMaterial, texture: Texture): void {
		if (vfxMaterial.transparent) {
			material.transparencyMode = Material.MATERIAL_ALPHABLEND;
			material.needDepthPrePass = false;
			texture.hasAlpha = true;
			material.useAlphaFromAlbedoTexture = true;
			this._logger.log(`Material is transparent (transparencyMode: ALPHABLEND, alphaMode: COMBINE)`);
		} else {
			material.transparencyMode = Material.MATERIAL_OPAQUE;
			material.alpha = 1.0;
		}
	}

	/**
	 * Applies depth write settings to material
	 */
	private _applyDepthWrite(material: PBRMaterial, vfxMaterial: VFXMaterial): void {
		if (vfxMaterial.depthWrite !== undefined) {
			material.disableDepthWrite = !vfxMaterial.depthWrite;
			this._logger.log(`Set disableDepthWrite: ${!vfxMaterial.depthWrite}`);
		} else {
			material.disableDepthWrite = true;
		}
	}

	/**
	 * Applies side orientation settings to material
	 */
	private _applySideSettings(material: PBRMaterial, vfxMaterial: VFXMaterial): void {
		material.backFaceCulling = false;

		if (vfxMaterial.side !== undefined) {
			material.sideOrientation = vfxMaterial.side;
			this._logger.log(`Set sideOrientation: ${vfxMaterial.side}`);
		}
	}

	/**
	 * Applies blend mode to material
	 */
	private _applyBlendMode(material: PBRMaterial, vfxMaterial: VFXMaterial): void {
		if (vfxMaterial.blending === undefined) {
			return;
		}

		const blendModeMap: Record<number, number> = {
			0: Constants.ALPHA_DISABLE, // NoBlending
			1: Constants.ALPHA_COMBINE, // NormalBlending
			2: Constants.ALPHA_ADD, // AdditiveBlending
		};

		const alphaMode = blendModeMap[vfxMaterial.blending];
		if (alphaMode !== undefined) {
			material.alphaMode = alphaMode;
			const modeNames: Record<number, string> = {
				0: "NO_BLENDING",
				1: "NORMAL",
				2: "ADDITIVE",
			};
			this._logger.log(`Set blend mode: ${modeNames[vfxMaterial.blending]}`);
		}
	}
}
