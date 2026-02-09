import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture as BabylonTexture } from "@babylonjs/core/Materials/Textures";
import type {
	IQuarksMaterial,
	IQuarksTexture,
	IQuarksImage,
	IQuarksGeometry,
	IQuarksShape,
	IQuarksGradientKey,
	IQuarksValue,
} from "./types";
import type { IMaterial, ITexture, IImage, IGeometry, IGeometryData, IGradientKey, IShape, Value } from "babylonjs-editor-tools";
import {
	THREE_REPEAT_WRAPPING,
	THREE_CLAMP_TO_EDGE_WRAPPING,
	THREE_MIRRORED_REPEAT_WRAPPING,
	THREE_LINEAR_FILTER,
	THREE_NEAREST_MIPMAP_NEAREST_FILTER,
	THREE_LINEAR_MIPMAP_NEAREST_FILTER,
	THREE_NEAREST_MIPMAP_LINEAR_FILTER,
	DEFAULT_COLOR_HEX,
} from "./constants";
import { convertValue } from "./valueConverter";
import { convertGradientKey } from "./colorConverter";

/**
 * Helper: Convert array of gradient keys
 */
export function convertGradientKeys(keys: IQuarksGradientKey[] | undefined): IGradientKey[] {
	return keys ? keys.map((k) => convertGradientKey(k)) : [];
}

/**
 * Helper: Convert speed/frame value (can be Value or object with keys)
 */
export function convertSpeedOrFrameValue(
	value: IQuarksValue | { keys?: IQuarksGradientKey[]; functions?: unknown[] } | undefined
): Value | { keys?: IGradientKey[]; functions?: unknown[] } | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "object" && value !== null && "keys" in value) {
		const result: { keys?: IGradientKey[]; functions?: unknown[] } = {};
		if (value.keys) {
			result.keys = convertGradientKeys(value.keys);
		}
		if ("functions" in value && value.functions) {
			result.functions = value.functions;
		}
		return result;
	}
	if (typeof value === "number" || (typeof value === "object" && value !== null && "type" in value)) {
		return convertValue(value as IQuarksValue);
	}
	return undefined;
}

/**
 * Helper: Flip Z coordinate in array (for left-handed conversion)
 */
function flipZCoordinate(array: number[], itemSize: number = 3): number[] {
	const result = Array.from(array);
	for (let i = itemSize - 1; i < result.length; i += itemSize) {
		result[i] = -result[i];
	}
	return result;
}

/**
 * Helper: Convert attribute array
 */
function convertAttribute(attr: { array: number[]; itemSize: number } | undefined, flipZ: boolean = false): { array: number[]; itemSize: number } | undefined {
	if (!attr) {
		return undefined;
	}
	return {
		array: flipZ ? flipZCoordinate(attr.array, attr.itemSize) : Array.from(attr.array),
		itemSize: attr.itemSize,
	};
}

/**
 * Convert IQuarks shape to shape
 */
export function convertShape(shape: IQuarksShape): IShape {
	const result: IShape = {
		type: shape.type,
		radius: shape.radius,
		arc: shape.arc,
		thickness: shape.thickness,
		angle: shape.angle,
		mode: shape.mode,
		spread: shape.spread,
		size: shape.size,
		height: shape.height,
	};
	if (shape.speed !== undefined) {
		result.speed = convertValue(shape.speed);
	}
	return result;
}

/**
 * Convert IQuarks materials to materials
 */
export function convertMaterial(material: IQuarksMaterial): IMaterial {
	const babylonMaterial: IMaterial = {
		uuid: material.uuid,
		type: material.type,
		transparent: material.transparent,
		depthWrite: material.depthWrite,
		side: material.side,
		map: material.map,
	};

	// Convert color from hex to Color3
	if (material.color !== undefined) {
		const colorHex = typeof material.color === "number" ? material.color : parseInt(String(material.color).replace("#", ""), 16) || DEFAULT_COLOR_HEX;
		const r = ((colorHex >> 16) & 0xff) / 255;
		const g = ((colorHex >> 8) & 0xff) / 255;
		const b = (colorHex & 0xff) / 255;
		babylonMaterial.color = new Color3(r, g, b);
	}

	// Convert blending mode (Three.js → Babylon.js)
	if (material.blending !== undefined) {
		const blendModeMap: Record<number, number> = {
			0: 0, // NoBlending → ALPHA_DISABLE
			1: 1, // NormalBlending → ALPHA_COMBINE
			2: 2, // AdditiveBlending → ALPHA_ADD
		};
		babylonMaterial.blending = blendModeMap[material.blending] ?? material.blending;
	}

	return babylonMaterial;
}

/**
 * Convert IQuarks textures to textures
 */
export function convertTexture(texture: IQuarksTexture): ITexture {
	const babylonTexture: ITexture = {
		uuid: texture.uuid,
		image: texture.image,
		generateMipmaps: texture.generateMipmaps,
		flipY: texture.flipY,
	};

	// Convert wrap mode (Three.js → Babylon.js)
	if (texture.wrap && Array.isArray(texture.wrap)) {
		const wrapModeMap: Record<number, number> = {
			[THREE_REPEAT_WRAPPING]: BabylonTexture.WRAP_ADDRESSMODE,
			[THREE_CLAMP_TO_EDGE_WRAPPING]: BabylonTexture.CLAMP_ADDRESSMODE,
			[THREE_MIRRORED_REPEAT_WRAPPING]: BabylonTexture.MIRROR_ADDRESSMODE,
		};
		babylonTexture.wrapU = wrapModeMap[texture.wrap[0]] ?? BabylonTexture.WRAP_ADDRESSMODE;
		babylonTexture.wrapV = wrapModeMap[texture.wrap[1]] ?? BabylonTexture.WRAP_ADDRESSMODE;
	}

	// Convert repeat to scale
	if (texture.repeat && Array.isArray(texture.repeat)) {
		babylonTexture.uScale = texture.repeat[0] || 1;
		babylonTexture.vScale = texture.repeat[1] || 1;
	}

	// Convert offset
	if (texture.offset && Array.isArray(texture.offset)) {
		babylonTexture.uOffset = texture.offset[0] || 0;
		babylonTexture.vOffset = texture.offset[1] || 0;
	}

	// Convert rotation
	if (texture.rotation !== undefined) {
		babylonTexture.uAng = texture.rotation;
	}

	// Convert channel
	if (typeof texture.channel === "number") {
		babylonTexture.coordinatesIndex = texture.channel;
	}

	// Convert sampling mode (Three.js filters → Babylon.js sampling mode)
	if (texture.minFilter !== undefined) {
		if (texture.minFilter === THREE_LINEAR_MIPMAP_NEAREST_FILTER || texture.minFilter === THREE_NEAREST_MIPMAP_LINEAR_FILTER) {
			babylonTexture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
		} else if (texture.minFilter === THREE_NEAREST_MIPMAP_NEAREST_FILTER || texture.minFilter === THREE_LINEAR_FILTER) {
			babylonTexture.samplingMode = BabylonTexture.BILINEAR_SAMPLINGMODE;
		} else {
			babylonTexture.samplingMode = BabylonTexture.NEAREST_SAMPLINGMODE;
		}
	} else if (texture.magFilter !== undefined) {
		babylonTexture.samplingMode = texture.magFilter === THREE_LINEAR_FILTER ? BabylonTexture.BILINEAR_SAMPLINGMODE : BabylonTexture.NEAREST_SAMPLINGMODE;
	} else {
		babylonTexture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
	}

	return babylonTexture;
}

/**
 * Convert IQuarks images to images (normalize URLs)
 */
export function convertImage(image: IQuarksImage): IImage {
	return {
		uuid: image.uuid,
		url: image.url || "",
	};
}

/**
 * Convert IQuarks geometries to geometries (convert to left-handed)
 */
export function convertGeometry(geometry: IQuarksGeometry): IGeometry {
	if (geometry.type === "PlaneGeometry") {
		// PlaneGeometry - simple properties
		const planeGeometry = geometry as IQuarksGeometry & { width?: number; height?: number };
		return {
			uuid: geometry.uuid,
			type: "PlaneGeometry" as const,
			width: planeGeometry.width ?? 1,
			height: planeGeometry.height ?? 1,
		};
	} else if (geometry.type === "BufferGeometry") {
		// BufferGeometry - convert attributes to left-handed
		const result: IGeometry = {
			uuid: geometry.uuid,
			type: "BufferGeometry",
		};

		if (geometry.data?.attributes) {
			const attributes: IGeometryData["attributes"] = {};
			const sourceAttrs = geometry.data.attributes;

			// Convert position and normal (right-hand → left-hand: flip Z)
			const positionAttr = convertAttribute(sourceAttrs.position, true);
			if (positionAttr) {
				attributes.position = positionAttr;
			}

			const normalAttr = convertAttribute(sourceAttrs.normal, true);
			if (normalAttr) {
				attributes.normal = normalAttr;
			}

			// UV and color - no conversion needed
			const uvAttr = convertAttribute(sourceAttrs.uv, false);
			if (uvAttr) {
				attributes.uv = uvAttr;
			}

			const colorAttr = convertAttribute(sourceAttrs.color, false);
			if (colorAttr) {
				attributes.color = colorAttr;
			}

			result.data = {
				attributes,
			};

			// Convert indices (reverse winding order for left-handed)
			if (geometry.data.index) {
				const indices = Array.from(geometry.data.index.array);
				// Reverse winding: swap every 2nd and 3rd index in each triangle
				for (let i = 0; i < indices.length; i += 3) {
					const temp = indices[i + 1];
					indices[i + 1] = indices[i + 2];
					indices[i + 2] = temp;
				}
				result.data.index = {
					array: indices,
				};
			}
		}

		return result;
	}

	// Unknown geometry type - return as-is
	return {
		uuid: geometry.uuid,
		type: geometry.type as "PlaneGeometry" | "BufferGeometry",
	};
}
