/**
 * Type definitions for Quarks/Three.js VFX JSON structures
 * These represent the incoming format from Quarks/Three.js
 */

/**
 * Quarks/Three.js value types
 */
export interface QuarksConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface QuarksIntervalValue {
	type: "IntervalValue";
	a: number; // min
	b: number; // max
}

export interface QuarksPiecewiseBezier {
	type: "PiecewiseBezier";
	functions: Array<{
		function: {
			p0: number;
			p1: number;
			p2: number;
			p3: number;
		};
		start: number;
	}>;
}

export type QuarksValue = QuarksConstantValue | QuarksIntervalValue | QuarksPiecewiseBezier | number;

/**
 * Quarks/Three.js color types
 */
export interface QuarksConstantColor {
	type: "ConstantColor";
	color?: {
		r: number;
		g: number;
		b: number;
		a?: number;
	};
	value?: [number, number, number, number]; // RGBA array alternative
}

export type QuarksColor = QuarksConstantColor | [number, number, number, number] | string;

/**
 * Quarks/Three.js rotation types
 */
export interface QuarksEulerRotation {
	type: "Euler";
	angleX?: QuarksValue;
	angleY?: QuarksValue;
	angleZ?: QuarksValue;
}

export type QuarksRotation = QuarksEulerRotation | QuarksValue;

/**
 * Quarks/Three.js gradient key
 */
export interface QuarksGradientKey {
	time?: number;
	value: number | [number, number, number, number] | { r: number; g: number; b: number; a?: number };
	pos?: number;
}

/**
 * Quarks/Three.js shape configuration
 */
export interface QuarksShape {
	type: string;
	radius?: number;
	arc?: number;
	thickness?: number;
	angle?: number;
	mode?: number;
	spread?: number;
	speed?: QuarksValue;
	size?: number[];
	height?: number;
}

/**
 * Quarks/Three.js emission burst
 */
export interface QuarksEmissionBurst {
	time: QuarksValue;
	count: QuarksValue;
}

/**
 * Quarks/Three.js behavior types
 */
export interface QuarksColorOverLifeBehavior {
	type: "ColorOverLife";
	color?: {
		color?: {
			keys: QuarksGradientKey[];
		};
		alpha?: {
			keys: QuarksGradientKey[];
		};
		keys?: QuarksGradientKey[];
	};
}

export interface QuarksSizeOverLifeBehavior {
	type: "SizeOverLife";
	size?: {
		keys?: QuarksGradientKey[];
		functions?: Array<{
			start: number;
			function: {
				p0?: number;
				p3?: number;
			};
		}>;
	};
}

export interface QuarksRotationOverLifeBehavior {
	type: "RotationOverLife" | "Rotation3DOverLife";
	angularVelocity?: QuarksValue;
}

export interface QuarksForceOverLifeBehavior {
	type: "ForceOverLife" | "ApplyForce";
	force?: {
		x?: QuarksValue;
		y?: QuarksValue;
		z?: QuarksValue;
	};
	x?: QuarksValue;
	y?: QuarksValue;
	z?: QuarksValue;
}

export interface QuarksGravityForceBehavior {
	type: "GravityForce";
	gravity?: QuarksValue;
}

export interface QuarksSpeedOverLifeBehavior {
	type: "SpeedOverLife";
	speed?:
		| {
				keys?: QuarksGradientKey[];
				functions?: Array<{
					start: number;
					function: {
						p0?: number;
						p3?: number;
					};
				}>;
		  }
		| QuarksValue;
}

export interface QuarksFrameOverLifeBehavior {
	type: "FrameOverLife";
	frame?:
		| {
				keys?: QuarksGradientKey[];
		  }
		| QuarksValue;
}

export interface QuarksLimitSpeedOverLifeBehavior {
	type: "LimitSpeedOverLife";
	maxSpeed?: QuarksValue;
	speed?: QuarksValue | { keys?: QuarksGradientKey[] };
	dampen?: QuarksValue;
}

export interface QuarksColorBySpeedBehavior {
	type: "ColorBySpeed";
	color?: {
		keys: QuarksGradientKey[];
	};
	minSpeed?: QuarksValue;
	maxSpeed?: QuarksValue;
}

export interface QuarksSizeBySpeedBehavior {
	type: "SizeBySpeed";
	size?: {
		keys: QuarksGradientKey[];
	};
	minSpeed?: QuarksValue;
	maxSpeed?: QuarksValue;
}

export interface QuarksRotationBySpeedBehavior {
	type: "RotationBySpeed";
	angularVelocity?: QuarksValue;
	minSpeed?: QuarksValue;
	maxSpeed?: QuarksValue;
}

export interface QuarksOrbitOverLifeBehavior {
	type: "OrbitOverLife";
	center?: {
		x?: number;
		y?: number;
		z?: number;
	};
	radius?: QuarksValue;
	speed?: QuarksValue;
}

export type QuarksBehavior =
	| QuarksColorOverLifeBehavior
	| QuarksSizeOverLifeBehavior
	| QuarksRotationOverLifeBehavior
	| QuarksForceOverLifeBehavior
	| QuarksGravityForceBehavior
	| QuarksSpeedOverLifeBehavior
	| QuarksFrameOverLifeBehavior
	| QuarksLimitSpeedOverLifeBehavior
	| QuarksColorBySpeedBehavior
	| QuarksSizeBySpeedBehavior
	| QuarksRotationBySpeedBehavior
	| QuarksOrbitOverLifeBehavior
	| { type: string; [key: string]: unknown }; // Fallback for unknown behaviors

/**
 * Quarks/Three.js particle emitter configuration
 */
export interface QuarksParticleEmitterConfig {
	version?: string;
	autoDestroy?: boolean;
	looping?: boolean;
	prewarm?: boolean;
	duration?: number;
	shape?: QuarksShape;
	startLife?: QuarksValue;
	startSpeed?: QuarksValue;
	startRotation?: QuarksRotation;
	startSize?: QuarksValue;
	startColor?: QuarksColor;
	emissionOverTime?: QuarksValue;
	emissionOverDistance?: QuarksValue;
	emissionBursts?: QuarksEmissionBurst[];
	onlyUsedByOther?: boolean;
	instancingGeometry?: string;
	renderOrder?: number;
	renderMode?: number;
	rendererEmitterSettings?: Record<string, unknown>;
	material?: string;
	layers?: number;
	startTileIndex?: QuarksValue;
	uTileCount?: number;
	vTileCount?: number;
	blendTiles?: boolean;
	softParticles?: boolean;
	softFarFade?: number;
	softNearFade?: number;
	behaviors?: QuarksBehavior[];
	worldSpace?: boolean;
}

/**
 * Quarks/Three.js object types
 */
export interface QuarksGroup {
	uuid: string;
	type: "Group";
	name: string;
	matrix?: number[];
	position?: number[];
	rotation?: number[];
	scale?: number[];
	children?: QuarksObject[];
}

export interface QuarksParticleEmitter {
	uuid: string;
	type: "ParticleEmitter";
	name: string;
	matrix?: number[];
	position?: number[];
	rotation?: number[];
	scale?: number[];
	ps: QuarksParticleEmitterConfig;
	children?: QuarksObject[];
}

export type QuarksObject = QuarksGroup | QuarksParticleEmitter;

/**
 * Quarks/Three.js material
 */
export interface QuarksMaterial {
	uuid: string;
	type: string;
	name?: string;
	color?: number;
	map?: string;
	blending?: number;
	side?: number;
	transparent?: boolean;
	depthWrite?: boolean;
}

/**
 * Quarks/Three.js texture
 */
export interface QuarksTexture {
	uuid: string;
	name?: string;
	image?: string;
	mapping?: number;
	wrap?: number[];
	repeat?: number[];
	offset?: number[];
	rotation?: number;
	minFilter?: number;
	magFilter?: number;
	flipY?: boolean;
	generateMipmaps?: boolean;
	format?: number;
	channel?: number;
}

/**
 * Quarks/Three.js image
 */
export interface QuarksImage {
	uuid: string;
	url?: string;
}

/**
 * Quarks/Three.js geometry
 */
export interface QuarksGeometry {
	uuid: string;
	type: string;
	data?: {
		attributes?: Record<
			string,
			{
				itemSize: number;
				type: string;
				array: number[];
			}
		>;
		index?: {
			type: string;
			array: number[];
		};
	};
}

/**
 * Quarks/Three.js JSON structure
 */
export interface QuarksVFXJSON {
	metadata?: {
		version?: number;
		type?: string;
		generator?: string;
	};
	geometries?: QuarksGeometry[];
	materials?: QuarksMaterial[];
	textures?: QuarksTexture[];
	images?: QuarksImage[];
	object?: QuarksObject;
}
