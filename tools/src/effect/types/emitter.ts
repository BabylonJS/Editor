import { Nullable, SolidParticle, TransformNode, Vector3 } from "babylonjs";
import type { Emitter } from "./hierarchy";
import type { Value } from "./values";
import type { Color } from "./colors";
import type { Rotation } from "./rotations";
import type { Shape } from "./shapes";
import type { Behavior } from "./behaviors";

/**
 *  emission burst (converted from Quarks)
 */
export interface EmissionBurst {
	time: Value;
	count: Value;
}

/**
 *  particle emitter configuration (converted from Quarks)
 */
export interface EmitterConfig {
	version?: string;
	autoDestroy?: boolean;
	looping?: boolean;
	prewarm?: boolean;
	duration?: number;
	shape?: Shape;
	startLife?: Value;
	startSpeed?: Value;
	startRotation?: Rotation;
	startSize?: Value;
	startColor?: Color;
	emissionOverTime?: Value;
	emissionOverDistance?: Value;
	emissionBursts?: EmissionBurst[];
	onlyUsedByOther?: boolean;
	instancingGeometry?: string;
	renderOrder?: number;
	systemType: "solid" | "base";
	rendererEmitterSettings?: Record<string, unknown>;
	material?: string;
	layers?: number;
	isBillboardBased?: boolean;
	billboardMode?: number;
	startTileIndex?: Value;
	uTileCount?: number;
	vTileCount?: number;
	blendTiles?: boolean;
	softParticles?: boolean;
	softFarFade?: number;
	softNearFade?: number;
	behaviors?: Behavior[];
	worldSpace?: boolean;
}

/**
 * Data structure for emitter creation
 */
export interface EmitterData {
	name: string;
	config: EmitterConfig;
	materialId?: string;
	matrix?: number[];
	position?: number[];
	parentGroup: Nullable<TransformNode>;
	cumulativeScale: Vector3;
	Emitter?: Emitter;
}

/**
 * Interface for SolidParticleSystem emitter types
 * Similar to IParticleEmitterType for ParticleSystem
 */
export interface ISolidParticleEmitterType {
	/**
	 * Initialize particle position and velocity based on emitter shape
	 */
	initializeParticle(particle: SolidParticle, startSpeed: number): void;
}
