import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { IParticleSystemConfig } from "./emitter";
import type { IMaterial, ITexture, IImage, IGeometry } from "./resources";

/**
 *  transform
 */
export interface ITransform {
	position: Vector3;
	rotation: Quaternion;
	scale: Vector3;
}

/**
 *  group
 */
export interface IGroup {
	uuid: string;
	name: string;
	transform: ITransform;
	children: (IGroup | IEmitter)[];
}

/**
 *  emitter
 */
export interface IEmitter {
	uuid: string;
	name: string;
	transform: ITransform;
	config: IParticleSystemConfig;
	materialId?: string;
	parentUuid?: string;
	systemType: "solid" | "base"; // Determined from renderMode: 2 = solid, otherwise base
	matrix?: number[]; // Original Three.js matrix array for rotation extraction
}

/**
 *  data
 */
export interface IData {
	root: IGroup | IEmitter | null;
	materials: IMaterial[];
	textures: ITexture[];
	images: IImage[];
	geometries: IGeometry[];
}
