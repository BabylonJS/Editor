import { Nullable, SolidParticle, TransformNode, Vector3 } from "babylonjs";
import type { IEmitter } from "./hierarchy";
import type { Value } from "./values";
import type { Color } from "./colors";
import type { Rotation } from "./rotations";
import type { IShape } from "./shapes";
import type { Behavior } from "./behaviors";

/**
 *  emission burst (converted from Quarks)
 */
export interface IEmissionBurst {
	time: Value;
	count: Value;
}

/**
 *  particle emitter configuration (converted from Quarks)
 */
export interface IEmitterConfig {
	version?: string;
	autoDestroy?: boolean;
	looping?: boolean;
	prewarm?: boolean;
	duration?: number;
	shape?: IShape;
	startLife?: Value;
	startSpeed?: Value;
	startRotation?: Rotation;
	startSize?: Value;
	startColor?: Color;
	emissionOverTime?: Value;
	emissionOverDistance?: Value;
	emissionBursts?: IEmissionBurst[];
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
export interface IEmitterData {
	name: string;
	config: IEmitterConfig;
	materialId?: string;
	matrix?: number[];
	position?: number[];
	parentGroup: Nullable<TransformNode>;
	cumulativeScale: Vector3;
	Emitter?: IEmitter;
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
