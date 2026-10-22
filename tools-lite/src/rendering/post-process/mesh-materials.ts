import { Material, Mesh, Texture2D } from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";
import { _getSerializedMaterialData } from "../../loading/material";
import { _getPbrTransparencyMode } from "../../loading/materials/pbr";
import { _getStandardTransparencyMode } from "../../loading/materials/standard";

/**
 * Defines a texture sampled by the passes drawing the meshes (glow map, velocity), with its texture matrix.
 */
export interface IMeshPassTexture {
	/**
	 * Defines the texture of Babylon Lite.
	 */
	texture: Texture2D;
	/**
	 * Defines the texture matrix, same as Babylon.js `Texture.getTextureMatrix`.
	 */
	matrix: ArrayLike<number>;
	/**
	 * Defines wether or not the texture is sampled using the second set of texture coordinates.
	 */
	uv2: boolean;
}

/**
 * Defines the alpha of a material as the materials of Babylon.js compute it, for the passes drawing the meshes with their
 * own shaders (glow map, velocity of the pre-pass).
 */
export interface IMeshPassMaterial {
	/**
	 * Defines the type of the material: PBR and standard materials (which write the geometry of the pre-pass renderer of
	 * Babylon.js), or another material (node materials, sky materials).
	 */
	type: "pbr" | "standard" | "other";
	/**
	 * Defines the serialized Babylon.js material, if any.
	 */
	data: any;
	/**
	 * Defines the alpha of the material.
	 */
	alpha: number;
	/**
	 * Defines the texture whose alpha channel multiplies the alpha ("DIFFUSE" define of the glow layer of Babylon.js).
	 */
	diffuse: IMeshPassTexture | null;
	/**
	 * Defines the opacity texture: luminance of its color when "rgb" is true, alpha otherwise, multiplied by its level.
	 */
	opacity: (IMeshPassTexture & { rgb: boolean; level: number }) | null;
	alphaTest: boolean;
	alphaCutOff: number;
	/**
	 * Defines wether or not the material is alpha blended (drawn after the other meshes, sorted from back to front).
	 */
	transparent: boolean;
	doubleSided: boolean;
	vertexAlpha: boolean;
}

/**
 * Same as Babylon.js `Texture.getTextureMatrix`, computed from the given serialized texture.
 * @param data defines the serialized texture.
 * @returns the texture matrix (16 values, Babylon.js layout).
 */
export function _getSerializedTextureMatrix(data: any): number[] {
	const uOffset = data?.uOffset ?? 0;
	const vOffset = data?.vOffset ?? 0;
	const uScale = data?.uScale ?? 1;
	const vScale = data?.vScale ?? 1;
	const uAng = data?.uAng ?? 0;
	const vAng = data?.vAng ?? 0;
	const wAng = data?.wAng ?? 0;
	const uRotationCenter = data?.uRotationCenter ?? 0.5;
	const vRotationCenter = data?.vRotationCenter ?? 0.5;
	const wRotationCenter = data?.wRotationCenter ?? 0.5;

	// Matrix.RotationYawPitchRollToRef(vAng, uAng, wAng): quaternion, then rotation matrix.
	const halfRoll = wAng * 0.5;
	const halfPitch = uAng * 0.5;
	const halfYaw = vAng * 0.5;
	const sinRoll = Math.sin(halfRoll);
	const cosRoll = Math.cos(halfRoll);
	const sinPitch = Math.sin(halfPitch);
	const cosPitch = Math.cos(halfPitch);
	const sinYaw = Math.sin(halfYaw);
	const cosYaw = Math.cos(halfYaw);

	const x = cosYaw * sinPitch * cosRoll + sinYaw * cosPitch * sinRoll;
	const y = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll;
	const z = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll;
	const w = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll;

	const xx = x * x;
	const yy = y * y;
	const zz = z * z;
	const xy = x * y;
	const zw = z * w;
	const zx = z * x;
	const yw = y * w;
	const yz = y * z;
	const xw = x * w;

	const rotation = new Float32Array([
		1 - 2 * (yy + zz),
		2 * (xy + zw),
		2 * (zx - yw),
		0,
		2 * (xy - zw),
		1 - 2 * (zz + xx),
		2 * (yz + xw),
		0,
		2 * (zx + yw),
		2 * (yz - xw),
		1 - 2 * (yy + xx),
		0,
		0,
		0,
		0,
		1,
	]);

	if (data?.homogeneousRotationInUVTransform) {
		warnOnce("mesh-pass-homogeneous-rotation", "the homogeneous rotation of the texture coordinates (homogeneousRotationInUVTransform) is not supported by the glow layer.");
	}

	// Same as "_prepareRowForTextureGeneration".
	const row = (rx: number, ry: number, rz: number): number[] => {
		rx = rx * uScale - uRotationCenter * uScale;
		ry = ry * vScale - vRotationCenter * vScale;
		rz -= wRotationCenter;

		const tx = rx * rotation[0] + ry * rotation[4] + rz * rotation[8] + rotation[12];
		const ty = rx * rotation[1] + ry * rotation[5] + rz * rotation[9] + rotation[13];
		const tz = rx * rotation[2] + ry * rotation[6] + rz * rotation[10] + rotation[14];
		const tw = 1 / (rx * rotation[3] + ry * rotation[7] + rz * rotation[11] + rotation[15]);

		return [tx * tw + uRotationCenter * uScale + uOffset, ty * tw + vRotationCenter * vScale + vOffset, tz * tw + wRotationCenter];
	};

	const t0 = row(0, 0, 0);
	const t1 = row(1, 0, 0);
	const t2 = row(0, 1, 0);

	return Array.from(new Float32Array([t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2], 0, t2[0] - t0[0], t2[1] - t0[1], t2[2] - t0[2], 0, t0[0], t0[1], t0[2], 0, 0, 0, 0, 1]));
}

/**
 * Defines the part of the description of the material of a mesh computed from its serialized data, kept until the
 * material of the mesh changes. The textures of Babylon Lite are resolved each time (loaded asynchronously): the
 * resolved description is kept until they change.
 */
interface IMeshPassMaterialDescription {
	material: Material;
	hasUv2: boolean;
	type: IMeshPassMaterial["type"];
	data: any;
	alpha: number;
	alphaTest: boolean;
	alphaCutOff: number;
	transparent: boolean;
	doubleSided: boolean;
	vertexAlpha: boolean;
	diffuse: { property: string; matrix: number[]; uv2: boolean } | null;
	opacity: { property: string; matrix: number[]; uv2: boolean; rgb: boolean; level: number } | null;
	resolved: IMeshPassMaterial | null;
	resolvedDiffuse: Texture2D | null;
	resolvedOpacity: Texture2D | null;
}

const descriptions = new WeakMap<Mesh, IMeshPassMaterialDescription>();

/**
 * Returns wether or not the given serialized material is a PBR material.
 * @param data defines the serialized material.
 */
export function _isSerializedPbrMaterial(data: any): boolean {
	const customType = data?.customType;
	return customType === "BABYLON.PBRMaterial" || customType === "BABYLON.PBRMetallicRoughnessMaterial" || customType === "BABYLON.PBRSpecularGlossinessMaterial";
}

/**
 * Returns wether or not the given serialized material is a standard material.
 * @param data defines the serialized material.
 */
export function _isSerializedStandardMaterial(data: any): boolean {
	const customType = data?.customType;
	return !!data && (customType === undefined || customType === null || customType === "BABYLON.StandardMaterial");
}

function describeMaterial(mesh: Mesh): IMeshPassMaterialDescription {
	const material = mesh.material;
	const data = _getSerializedMaterialData(material);
	const hasUv2 = !!(mesh as unknown as { _gpu?: { uv2Buffer: GPUBuffer | null } })._gpu?.uv2Buffer;

	const isPbr = _isSerializedPbrMaterial(data);
	const isStandard = !isPbr && _isSerializedStandardMaterial(data);

	const slot = (property: string, textureData: any) => ({ property, matrix: _getSerializedTextureMatrix(textureData), uv2: hasUv2 && textureData?.coordinatesIndex === 1 });

	const description: IMeshPassMaterialDescription = {
		material,
		hasUv2,
		type: isPbr ? "pbr" : isStandard ? "standard" : "other",
		data,
		alpha: data?.alpha ?? 1,
		alphaTest: false,
		alphaCutOff: data?.alphaCutOff ?? 0.4,
		transparent: false,
		doubleSided: data ? data.backFaceCulling === false : false,
		vertexAlpha: !!(mesh as unknown as { hasVertexAlpha?: boolean }).hasVertexAlpha && data?.transparencyMode !== 0,
		diffuse: null,
		opacity: null,
		resolved: null,
		resolvedDiffuse: null,
		resolvedOpacity: null,
	};

	if (isPbr) {
		const mode = _getPbrTransparencyMode(data);
		description.alphaTest = mode === 1 || mode === 3;
		description.transparent = mode === 2 || mode === 3;

		// The alpha of the base color texture of Babylon Lite is the alpha Babylon.js computes for the transparent materials
		// (alpha of the albedo texture and opacity texture).
		if (description.alphaTest || description.transparent) {
			description.diffuse = slot("baseColorTexture", data.albedoTexture ?? data.opacityTexture);
		}
	} else if (isStandard) {
		const mode = _getStandardTransparencyMode(data);
		const diffuseHasAlpha = !!data.diffuseTexture?.hasAlpha;

		description.alphaTest = mode === 1 || mode === 3;
		description.transparent = mode === 2 || mode === 3;

		// Same as Babylon.js: the alpha of the diffuse texture when tested or used for the blending, then the opacity texture.
		const alphaFromDiffuse = diffuseHasAlpha && !!data.useAlphaFromDiffuseTexture;
		if (data.diffuseTexture && (description.alphaTest || alphaFromDiffuse)) {
			description.diffuse = slot("diffuseTexture", data.diffuseTexture);
		}

		const opacityData = data.opacityTexture && !data.opacityTexture.isCube ? data.opacityTexture : null;
		if (opacityData && description.transparent) {
			if (alphaFromDiffuse && mode !== 0) {
				// Babylon Lite reads the alpha of the diffuse texture combined with the opacity (and its level) from a single
				// texture, used instead of both textures.
				description.diffuse = null;
				description.opacity = { ...slot("_opacityTexture", data.diffuseTexture), rgb: false, level: 1 };
			} else {
				description.opacity = { ...slot("_opacityTexture", opacityData), rgb: !!opacityData.getAlphaFromRGB, level: opacityData.level ?? 1 };
			}
		}
	}

	return description;
}

/**
 * Returns how the alpha of the material of the given mesh is computed, same as the materials of Babylon.js.
 * @param mesh defines the reference to the mesh.
 * @returns the description of the material, shared by the calls while the material and its textures don't change (read
 * only).
 */
export function _getMeshPassMaterial(mesh: Mesh): IMeshPassMaterial {
	let description = descriptions.get(mesh);
	const hasUv2 = !!(mesh as unknown as { _gpu?: { uv2Buffer: GPUBuffer | null } })._gpu?.uv2Buffer;

	if (!description || description.material !== mesh.material || description.hasUv2 !== hasUv2) {
		description = describeMaterial(mesh);
		descriptions.set(mesh, description);
	}

	const textures = mesh.material as unknown as Record<string, Texture2D | null | undefined>;
	const diffuse = description.diffuse ? (textures[description.diffuse.property] ?? null) : null;
	const opacity = description.opacity ? (textures[description.opacity.property] ?? null) : null;

	if (description.resolved && description.resolvedDiffuse === diffuse && description.resolvedOpacity === opacity) {
		return description.resolved;
	}

	description.resolvedDiffuse = diffuse;
	description.resolvedOpacity = opacity;
	description.resolved = {
		type: description.type,
		data: description.data,
		alpha: description.alpha,
		diffuse: diffuse ? { texture: diffuse, matrix: description.diffuse!.matrix, uv2: description.diffuse!.uv2 } : null,
		opacity: opacity
			? { texture: opacity, matrix: description.opacity!.matrix, uv2: description.opacity!.uv2, rgb: description.opacity!.rgb, level: description.opacity!.level }
			: null,
		alphaTest: description.alphaTest,
		alphaCutOff: description.alphaCutOff,
		transparent: description.transparent,
		doubleSided: description.doubleSided,
		vertexAlpha: description.vertexAlpha,
	};

	return description.resolved;
}

/**
 * Returns the distance between the center of the bounding box of the given mesh and the given camera position, as
 * Babylon.js sorts the transparent meshes.
 * @param mesh defines the reference to the mesh.
 * @param cameraWorld defines the world matrix of the camera.
 */
export function _getMeshDistanceToCamera(mesh: Mesh, cameraWorld: ArrayLike<number>): number {
	const min = mesh.boundMin ?? [0, 0, 0];
	const max = mesh.boundMax ?? [0, 0, 0];
	const cx = (min[0] + max[0]) * 0.5;
	const cy = (min[1] + max[1]) * 0.5;
	const cz = (min[2] + max[2]) * 0.5;

	const world = mesh.worldMatrix;
	const x = cx * world[0] + cy * world[4] + cz * world[8] + world[12];
	const y = cx * world[1] + cy * world[5] + cz * world[9] + world[13];
	const z = cx * world[2] + cy * world[6] + cz * world[10] + world[14];

	return Math.hypot(x - cameraWorld[12], y - cameraWorld[13], z - cameraWorld[14]);
}
