import { Vector3, Quaternion } from "babylonjs";
import type { IParticleSystemConfig } from "./emitter";
import type { IMaterial, ITexture, IImage, IGeometry } from "./resources";

/**
 *  transform (converted from Quarks, left-handed coordinate system)
 */
export interface ITransform {
	position: Vector3;
	rotation: Quaternion;
	scale: Vector3;
}

/**
 *  group (converted from Quarks)
 */
export interface IGroup {
	uuid: string;
	name: string;
	transform: ITransform;
	children: (IGroup | IEmitter)[];
}

/**
 *  emitter (converted from Quarks)
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
 *  data (converted from Quarks)
 * Contains the converted  structure with groups, emitters, and resources
 */
export interface IData {
	root: IGroup | IEmitter | null;
	materials: IMaterial[];
	textures: ITexture[];
	images: IImage[];
	geometries: IGeometry[];
}
