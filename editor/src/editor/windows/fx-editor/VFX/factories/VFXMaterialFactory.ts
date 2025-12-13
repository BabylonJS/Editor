import { Nullable, Color3, Texture, PBRMaterial, Material, Constants, Tools } from "babylonjs";
import type { IVFXMaterialFactory } from "../types/factories";
import type { VFXParseContext } from "../types/context";
import { VFXLogger } from "../loggers/VFXLogger";
import type { QuarksTexture, QuarksMaterial, QuarksImage } from "../types/quarksTypes";

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
		const { jsonData } = this._context;
		const material = jsonData.materials?.find((m: any) => m.uuid === materialId);

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
	private _resolveTextureData(materialId: string): { material: QuarksMaterial; texture: QuarksTexture; image: QuarksImage } | null {
		const { options } = this._context;

		if (!this._hasRequiredData()) {
			this._logger.warn(`Missing materials/textures/images data for material ${materialId}`, options);
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
		const { jsonData } = this._context;
		return !!(jsonData.materials && jsonData.textures && jsonData.images);
	}

	/**
	 * Finds material by UUID
	 */
	private _findMaterial(materialId: string): QuarksMaterial | null {
		const { jsonData, options } = this._context;
		const material = jsonData.materials?.find((m) => m.uuid === materialId);
		if (!material) {
			this._logger.warn(`Material not found: ${materialId}`, options);
			return null;
		}
		return material;
	}

	/**
	 * Finds texture by UUID
	 */
	private _findTexture(textureId: string): QuarksTexture | null {
		const { jsonData, options } = this._context;
		const texture = jsonData.textures?.find((t) => t.uuid === textureId);
		if (!texture) {
			this._logger.warn(`Texture not found: ${textureId}`, options);
			return null;
		}
		return texture;
	}

	/**
	 * Finds image by UUID
	 */
	private _findImage(imageId: string): QuarksImage | null {
		const { jsonData, options } = this._context;
		const image = jsonData.images?.find((img) => img.uuid === imageId);
		if (!image) {
			this._logger.warn(`Image not found: ${imageId}`, options);
			return null;
		}
		return image;
	}

	/**
	 * Builds texture URL from image data
	 */
	private _buildTextureUrl(image: QuarksImage): string {
		const { rootUrl } = this._context;
		if (!image.url) {
			return "";
		}
		const isBase64 = image.url.startsWith("data:");
		return isBase64 ? image.url : Tools.GetAssetUrl(rootUrl + image.url);
	}

	/**
	 * Parses sampling mode from Three.js texture filters
	 */
	private _parseSamplingMode(texture: QuarksTexture): number {
		// Three.js filter constants:
		// 1006 = LinearFilter (BILINEAR)
		// 1007 = NearestMipmapLinearFilter
		// 1008 = LinearMipmapLinearFilter (TRILINEAR)
		// 1009 = LinearMipmapNearestFilter

		if (texture.minFilter !== undefined) {
			if (texture.minFilter === 1008 || texture.minFilter === 1009) {
				return Texture.TRILINEAR_SAMPLINGMODE;
			}
			if (texture.minFilter === 1007 || texture.minFilter === 1006) {
				return Texture.BILINEAR_SAMPLINGMODE;
			}
			return Texture.NEAREST_SAMPLINGMODE;
		}

		if (texture.magFilter !== undefined) {
			return texture.magFilter === 1006 ? Texture.BILINEAR_SAMPLINGMODE : Texture.NEAREST_SAMPLINGMODE;
		}

		return Texture.TRILINEAR_SAMPLINGMODE;
	}

	/**
	 * Applies texture properties from Three.js JSON to Babylon.js texture
	 */
	private _applyTextureProperties(babylonTexture: Texture, texture: QuarksTexture): void {
		// Wrap mode: Three.js 1000=Repeat, 1001=Clamp, 1002=Mirror
		if (texture.wrap && Array.isArray(texture.wrap)) {
			const wrapModeMap: Record<number, number> = {
				1000: Texture.WRAP_ADDRESSMODE,
				1001: Texture.CLAMP_ADDRESSMODE,
				1002: Texture.MIRROR_ADDRESSMODE,
			};
			babylonTexture.wrapU = wrapModeMap[texture.wrap[0]] ?? Texture.WRAP_ADDRESSMODE;
			babylonTexture.wrapV = wrapModeMap[texture.wrap[1]] ?? Texture.WRAP_ADDRESSMODE;
		}

		if (texture.repeat && Array.isArray(texture.repeat)) {
			babylonTexture.uScale = texture.repeat[0] || 1;
			babylonTexture.vScale = texture.repeat[1] || 1;
		}

		if (texture.offset && Array.isArray(texture.offset)) {
			babylonTexture.uOffset = texture.offset[0] || 0;
			babylonTexture.vOffset = texture.offset[1] || 0;
		}

		if (typeof texture.channel === "number") {
			babylonTexture.coordinatesIndex = texture.channel;
		}

		if (texture.rotation !== undefined) {
			babylonTexture.uAng = texture.rotation;
		}
	}

	/**
	 * Creates Babylon.js texture from texture data
	 */
	private _createTextureFromData(textureUrl: string, texture: QuarksTexture): Texture {
		const { scene } = this._context;
		const samplingMode = this._parseSamplingMode(texture);

		const babylonTexture = new Texture(textureUrl, scene, {
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
		const { options } = this._context;
		this._logger.log(`Creating material for ID: ${materialId}, name: ${name}`, options);

		const textureData = this._resolveTextureData(materialId);
		if (!textureData) {
			return null;
		}

		const { material, texture, image } = textureData;
		const materialType = material.type || "MeshStandardMaterial";

		this._logMaterialInfo(material, texture, image, materialType);

		const textureUrl = this._buildTextureUrl(image);
		const babylonTexture = this._createTextureFromData(textureUrl, texture);
		const materialColor = this._parseMaterialColor(material);

		if (materialType === "MeshBasicMaterial") {
			return this._createUnlitMaterial(name, material, babylonTexture, materialColor);
		}

		return new PBRMaterial(name + "_material", this._context.scene);
	}

	/**
	 * Logs material, texture, and image information
	 */
	private _logMaterialInfo(material: QuarksMaterial, texture: QuarksTexture, image: QuarksImage, materialType: string): void {
		const { options } = this._context;
		this._logger.log(`Found material: type=${materialType}, uuid=${material.uuid}, transparent=${material.transparent}, blending=${material.blending}`, options);
		this._logger.log(`Found texture: ${JSON.stringify({ uuid: texture.uuid, image: texture.image })}`, options);

		const imageInfo = this._formatImageInfo(image);
		this._logger.log(`Found image: ${imageInfo}`, options);
	}

	/**
	 * Formats image information for logging
	 */
	private _formatImageInfo(image: QuarksImage): string {
		if (!image.url) {
			return "unknown";
		}

		const urlParts = image.url.split("/");
		let filename = urlParts[urlParts.length - 1] || image.url;
		if (filename.length > 50) {
			filename = filename.substring(0, 20) + "...";
		}
		return `file: ${filename}`;
	}

	/**
	 * Parses material color from Three.js format
	 */
	private _parseMaterialColor(material: QuarksMaterial): Color3 {
		const { options } = this._context;

		if (material.color === undefined) {
			return new Color3(1, 1, 1);
		}

		const colorHex = this._parseColorHex(material.color);
		const r = ((colorHex >> 16) & 0xff) / 255;
		const g = ((colorHex >> 8) & 0xff) / 255;
		const b = (colorHex & 0xff) / 255;

		this._logger.log(`Parsed material color: R=${r.toFixed(2)}, G=${g.toFixed(2)}, B=${b.toFixed(2)}`, options);
		return new Color3(r, g, b);
	}

	/**
	 * Parses color hex value from various formats
	 */
	private _parseColorHex(color: number | string): number {
		if (typeof color === "number") {
			return color;
		}
		if (typeof color === "string") {
			return parseInt(color.replace("#", ""), 16);
		}
		return 0xffffff;
	}

	/**
	 * Creates unlit material (MeshBasicMaterial equivalent)
	 */
	private _createUnlitMaterial(name: string, material: QuarksMaterial, texture: Texture, color: Color3): PBRMaterial {
		const { scene, options } = this._context;
		const unlitMaterial = new PBRMaterial(name + "_material", scene);

		unlitMaterial.unlit = true;
		unlitMaterial.albedoColor = color;
		unlitMaterial.albedoTexture = texture;

		this._applyTransparency(unlitMaterial, material, texture);
		this._applyDepthWrite(unlitMaterial, material);
		this._applySideSettings(unlitMaterial, material);
		this._applyBlendMode(unlitMaterial, material);

		this._logger.log(`Using MeshBasicMaterial: PBRMaterial with unlit=true, albedoTexture`, options);
		this._logger.log(`Material created successfully: ${name}_material`, options);

		return unlitMaterial;
	}

	/**
	 * Applies transparency settings to material
	 */
	private _applyTransparency(material: PBRMaterial, quarksMaterial: QuarksMaterial, texture: Texture): void {
		const { options } = this._context;

		if (quarksMaterial.transparent) {
			material.transparencyMode = Material.MATERIAL_ALPHABLEND;
			material.needDepthPrePass = false;
			texture.hasAlpha = true;
			material.useAlphaFromAlbedoTexture = true;
			this._logger.log(`Material is transparent (transparencyMode: ALPHABLEND, alphaMode: COMBINE)`, options);
		} else {
			material.transparencyMode = Material.MATERIAL_OPAQUE;
			material.alpha = 1.0;
		}
	}

	/**
	 * Applies depth write settings to material
	 */
	private _applyDepthWrite(material: PBRMaterial, quarksMaterial: QuarksMaterial): void {
		const { options } = this._context;

		if (quarksMaterial.depthWrite !== undefined) {
			material.disableDepthWrite = !quarksMaterial.depthWrite;
			this._logger.log(`Set disableDepthWrite: ${!quarksMaterial.depthWrite}`, options);
		} else {
			material.disableDepthWrite = true;
		}
	}

	/**
	 * Applies side orientation settings to material
	 */
	private _applySideSettings(material: PBRMaterial, quarksMaterial: QuarksMaterial): void {
		const { options } = this._context;

		material.backFaceCulling = false;

		if (quarksMaterial.side !== undefined) {
			material.sideOrientation = quarksMaterial.side;
			this._logger.log(`Set sideOrientation: ${quarksMaterial.side}`, options);
		}
	}

	/**
	 * Applies blend mode to material
	 */
	private _applyBlendMode(material: PBRMaterial, quarksMaterial: QuarksMaterial): void {
		const { options } = this._context;

		if (quarksMaterial.blending === undefined) {
			return;
		}

		const blendModeMap: Record<number, number> = {
			0: Constants.ALPHA_DISABLE, // NoBlending
			1: Constants.ALPHA_COMBINE, // NormalBlending
			2: Constants.ALPHA_ADD, // AdditiveBlending
		};

		const alphaMode = blendModeMap[quarksMaterial.blending];
		if (alphaMode !== undefined) {
			material.alphaMode = alphaMode;
			const modeNames: Record<number, string> = {
				0: "NO_BLENDING",
				1: "NORMAL",
				2: "ADDITIVE",
			};
			this._logger.log(`Set blend mode: ${modeNames[quarksMaterial.blending]}`, options);
		}
	}
}
