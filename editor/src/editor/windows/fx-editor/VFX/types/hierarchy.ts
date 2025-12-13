import { Vector3, Quaternion } from "babylonjs";
import type { VFXParticleEmitterConfig } from "./emitterConfig";
import type { VFXMaterial, VFXTexture, VFXImage, VFXGeometry } from "./resources";

/**
 * VFX transform (converted from Quarks, left-handed coordinate system)
 */
export interface VFXTransform {
	position: Vector3;
	rotation: Quaternion;
	scale: Vector3;
}

/**
 * VFX group (converted from Quarks)
 */
export interface VFXGroup {
	uuid: string;
	name: string;
	transform: VFXTransform;
	children: (VFXGroup | VFXEmitter)[];
}

/**
 * VFX emitter (converted from Quarks)
 */
export interface VFXEmitter {
	uuid: string;
	name: string;
	transform: VFXTransform;
	config: VFXParticleEmitterConfig;
	materialId?: string;
	parentUuid?: string;
	systemType: "solid" | "base"; // Determined from renderMode: 2 = solid, otherwise base
	matrix?: number[]; // Original Three.js matrix array for rotation extraction
}

/**
 * VFX data (converted from Quarks)
 * Contains the converted VFX structure with groups, emitters, and resources
 */
export interface VFXData {
	root: VFXGroup | VFXEmitter | null;
	groups: Map<string, VFXGroup>;
	emitters: Map<string, VFXEmitter>;
	// Resources (converted from Quarks, ready for Babylon.js)
	materials: VFXMaterial[];
	textures: VFXTexture[];
	images: VFXImage[];
	geometries: VFXGeometry[];
}
