/**
 * Type definitions for Quarks/Three.js  JSON structures
 * These represent the incoming format from Quarks/Three.js
 */

/**
 * Quarks/Three.js value types
 */
export interface IQuarksConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface IQuarksIntervalValue {
	type: "IntervalValue";
	a: number; // min
	b: number; // max
}

export interface IQuarksPiecewiseBezier {
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

export type IQuarksValue = IQuarksConstantValue | IQuarksIntervalValue | IQuarksPiecewiseBezier | number;

/**
 * Quarks/Three.js color types
 */
export interface IQuarksConstantColor {
	type: "ConstantColor";
	color?: {
		r: number;
		g: number;
		b: number;
		a?: number;
	};
	value?: [number, number, number, number]; // RGBA array alternative
}

export type IQuarksColor = IQuarksConstantColor | [number, number, number, number] | string;

/**
 * Quarks/Three.js rotation types
 */
export interface IQuarksEulerRotation {
	type: "Euler";
	angleX?: IQuarksValue;
	angleY?: IQuarksValue;
	angleZ?: IQuarksValue;
}

export type IQuarksRotation = IQuarksEulerRotation | IQuarksValue;

/**
 * Quarks/Three.js gradient key
 */
export interface IQuarksGradientKey {
	time?: number;
	value: number | [number, number, number, number] | { r: number; g: number; b: number; a?: number };
	pos?: number;
}

/**
 * Quarks/Three.js shape configuration
 */
export interface IQuarksShape {
	type: string;
	radius?: number;
	arc?: number;
	thickness?: number;
	angle?: number;
	mode?: number;
	spread?: number;
	speed?: IQuarksValue;
	size?: number[];
	height?: number;
}

/**
 * Quarks/Three.js emission burst
 */
export interface IQuarksEmissionBurst {
	time: IQuarksValue;
	count: IQuarksValue;
}

/**
 * Quarks/Three.js behavior types
 */
export interface IQuarksCLinearFunction {
	type: "CLinearFunction";
	subType: "Color" | "Number";
	keys: IQuarksGradientKey[];
}

export interface IQuarksGradientColor {
	type: "Gradient";
	color?: IQuarksCLinearFunction;
	alpha?: IQuarksCLinearFunction;
}

export interface IQuarksConstantColorColor {
	type: "ConstantColor";
	color?: {
		r: number;
		g: number;
		b: number;
		a?: number;
	};
	value?: [number, number, number, number];
}

export interface IQuarksRandomColorBetweenGradient {
	type: "RandomColorBetweenGradient";
	gradient1?: IQuarksGradientColor;
	gradient2?: IQuarksGradientColor;
}

export type IQuarksColorOverLifeColor = IQuarksGradientColor | IQuarksConstantColorColor | IQuarksRandomColorBetweenGradient;

export interface IQuarksColorOverLifeBehavior {
	type: "ColorOverLife";
	color?: IQuarksColorOverLifeColor;
}

export interface IQuarksSizeOverLifeBehavior {
	type: "SizeOverLife";
	size?: {
		keys?: IQuarksGradientKey[];
		functions?: Array<{
			start: number;
			function: {
				p0?: number;
				p3?: number;
			};
		}>;
	};
}

export interface IQuarksRotationOverLifeBehavior {
	type: "RotationOverLife" | "Rotation3DOverLife";
	angularVelocity?: IQuarksValue;
}

export interface IQuarksForceOverLifeBehavior {
	type: "ForceOverLife" | "ApplyForce";
	force?: {
		x?: IQuarksValue;
		y?: IQuarksValue;
		z?: IQuarksValue;
	};
	x?: IQuarksValue;
	y?: IQuarksValue;
	z?: IQuarksValue;
}

export interface IQuarksGravityForceBehavior {
	type: "GravityForce";
	gravity?: IQuarksValue;
}

export interface IQuarksSpeedOverLifeBehavior {
	type: "SpeedOverLife";
	speed?:
		| {
				keys?: IQuarksGradientKey[];
				functions?: Array<{
					start: number;
					function: {
						p0?: number;
						p3?: number;
					};
				}>;
		  }
		| IQuarksValue;
}

export interface IQuarksFrameOverLifeBehavior {
	type: "FrameOverLife";
	frame?:
		| {
				keys?: IQuarksGradientKey[];
		  }
		| IQuarksValue;
}

export interface IQuarksLimitSpeedOverLifeBehavior {
	type: "LimitSpeedOverLife";
	maxSpeed?: IQuarksValue;
	speed?: IQuarksValue | { keys?: IQuarksGradientKey[] };
	dampen?: IQuarksValue;
}

export interface IQuarksColorBySpeedBehavior {
	type: "ColorBySpeed";
	color?: {
		keys: IQuarksGradientKey[];
	};
	minSpeed?: IQuarksValue;
	maxSpeed?: IQuarksValue;
}

export interface IQuarksSizeBySpeedBehavior {
	type: "SizeBySpeed";
	size?: {
		keys: IQuarksGradientKey[];
	};
	minSpeed?: IQuarksValue;
	maxSpeed?: IQuarksValue;
}

export interface IQuarksRotationBySpeedBehavior {
	type: "RotationBySpeed";
	angularVelocity?: IQuarksValue;
	minSpeed?: IQuarksValue;
	maxSpeed?: IQuarksValue;
}

export interface IQuarksOrbitOverLifeBehavior {
	type: "OrbitOverLife";
	center?: {
		x?: number;
		y?: number;
		z?: number;
	};
	radius?: IQuarksValue;
	speed?: IQuarksValue;
}

export type IQuarksBehavior =
	| IQuarksColorOverLifeBehavior
	| IQuarksSizeOverLifeBehavior
	| IQuarksRotationOverLifeBehavior
	| IQuarksForceOverLifeBehavior
	| IQuarksGravityForceBehavior
	| IQuarksSpeedOverLifeBehavior
	| IQuarksFrameOverLifeBehavior
	| IQuarksLimitSpeedOverLifeBehavior
	| IQuarksColorBySpeedBehavior
	| IQuarksSizeBySpeedBehavior
	| IQuarksRotationBySpeedBehavior
	| IQuarksOrbitOverLifeBehavior
	| { type: string; [key: string]: unknown }; // Fallback for unknown behaviors

/**
 * Quarks/Three.js particle emitter configuration
 */
export interface IQuarksParticleEmitterConfig {
	version?: string;
	autoDestroy?: boolean;
	looping?: boolean;
	prewarm?: boolean;
	duration?: number;
	shape?: IQuarksShape;
	startLife?: IQuarksValue;
	startSpeed?: IQuarksValue;
	startRotation?: IQuarksRotation;
	startSize?: IQuarksValue;
	startColor?: IQuarksColor;
	emissionOverTime?: IQuarksValue;
	emissionOverDistance?: IQuarksValue;
	emissionBursts?: IQuarksEmissionBurst[];
	onlyUsedByOther?: boolean;
	instancingGeometry?: string;
	renderOrder?: number;
	renderMode?: number;
	rendererEmitterSettings?: Record<string, unknown>;
	material?: string;
	layers?: number;
	startTileIndex?: IQuarksValue;
	uTileCount?: number;
	vTileCount?: number;
	blendTiles?: boolean;
	softParticles?: boolean;
	softFarFade?: number;
	softNearFade?: number;
	behaviors?: IQuarksBehavior[];
	worldSpace?: boolean;
}

/**
 * Quarks/Three.js object types
 */
export interface IQuarksGroup {
	uuid: string;
	type: "Group";
	name: string;
	matrix?: number[];
	position?: number[];
	rotation?: number[];
	scale?: number[];
	children?: IQuarksObject[];
}

export interface IQuarksParticleEmitter {
	uuid: string;
	type: "ParticleEmitter";
	name: string;
	matrix?: number[];
	position?: number[];
	rotation?: number[];
	scale?: number[];
	ps: IQuarksParticleEmitterConfig;
	children?: IQuarksObject[];
}

export type IQuarksObject = IQuarksGroup | IQuarksParticleEmitter;

/**
 * Quarks/Three.js material
 */
export interface IQuarksMaterial {
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
export interface IQuarksTexture {
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
export interface IQuarksImage {
	uuid: string;
	url?: string;
}

/**
 * Quarks/Three.js geometry
 */
export interface IQuarksGeometry {
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
export interface IQuarksJSON {
	metadata?: {
		version?: number;
		type?: string;
		generator?: string;
	};
	geometries?: IQuarksGeometry[];
	materials?: IQuarksMaterial[];
	textures?: IQuarksTexture[];
	images?: IQuarksImage[];
	object?: IQuarksObject;
}
