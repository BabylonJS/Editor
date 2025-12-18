import { Nullable, SolidParticle, TransformNode, Vector3 } from "babylonjs";
import type { IEmitter } from "./hierarchy";
import type { Value } from "./values";
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
 * Particle system configuration (converted from Quarks to native Babylon.js properties)
 */
export interface IParticleSystemConfig {
	version?: string;
	systemType: "solid" | "base";

	// === Native Babylon.js properties (converted from Quarks Value) ===

	// Life & Size
	minLifeTime?: number;
	maxLifeTime?: number;
	minSize?: number;
	maxSize?: number;
	minScaleX?: number;
	maxScaleX?: number;
	minScaleY?: number;
	maxScaleY?: number;

	// Speed & Power
	minEmitPower?: number;
	maxEmitPower?: number;
	emitRate?: number;

	// Rotation
	minInitialRotation?: number;
	maxInitialRotation?: number;
	minAngularSpeed?: number;
	maxAngularSpeed?: number;

	// Color
	color1?: import("babylonjs").Color4;
	color2?: import("babylonjs").Color4;
	colorDead?: import("babylonjs").Color4;

	// Duration & Looping
	targetStopDuration?: number; // 0 = infinite (looping), >0 = duration
	manualEmitCount?: number; // -1 = automatic, otherwise specific count

	// Prewarm
	preWarmCycles?: number;
	preWarmStepOffset?: number;

	// Physics
	gravity?: import("babylonjs").Vector3;
	noiseStrength?: import("babylonjs").Vector3;
	updateSpeed?: number;

	// World space
	isLocal?: boolean;

	// Auto destroy
	disposeOnStop?: boolean;

	// Gradients for PiecewiseBezier
	startSizeGradients?: Array<{ gradient: number; factor: number; factor2?: number }>;
	lifeTimeGradients?: Array<{ gradient: number; factor: number; factor2?: number }>;
	emitRateGradients?: Array<{ gradient: number; factor: number; factor2?: number }>;

	// === Other properties ===
	shape?: IShape;
	emissionBursts?: IEmissionBurst[];
	emissionOverDistance?: Value; // For solid system only
	onlyUsedByOther?: boolean;
	instancingGeometry?: string;
	renderOrder?: number;
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
}

/**
 * Data structure for emitter creation
 */
export interface IEmitterData {
	name: string;
	config: IParticleSystemConfig;
	materialId?: string;
	matrix?: number[];
	position?: number[];
	parentGroup: Nullable<TransformNode>;
	cumulativeScale: Vector3;
	emitter?: IEmitter;
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
