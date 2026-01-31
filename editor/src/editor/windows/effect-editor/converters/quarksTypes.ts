/**
 * Type definitions for Quarks  JSON structures
 * These represent the incoming format from Quarks
 */

/**
 * Common Bezier function structure used across multiple types
 */
export interface IQuarksBezierFunction {
	p0: number;
	p1: number;
	p2: number;
	p3: number;
}

export interface IQuarksBezierFunctionSegment {
	function: IQuarksBezierFunction;
	start: number;
}

/**
 * Common RGBA color structure
 */
export interface IQuarksRGBA {
	r: number;
	g: number;
	b: number;
	a?: number;
}

/**
 * Quarks value types
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
	functions: IQuarksBezierFunctionSegment[];
}

export type IQuarksValue = IQuarksConstantValue | IQuarksIntervalValue | IQuarksPiecewiseBezier | number;

/**
 * Quarks color types
 */
export interface IQuarksConstantColor {
	type: "ConstantColor";
	color?: IQuarksRGBA;
	value?: [number, number, number, number]; // RGBA array alternative
}

export type IQuarksColor = IQuarksConstantColor | [number, number, number, number] | string;

/**
 * Quarks rotation types
 */
export interface IQuarksEulerRotation {
	type: "Euler";
	angleX?: IQuarksValue;
	angleY?: IQuarksValue;
	angleZ?: IQuarksValue;
	eulerOrder?: string;
	functions?: IQuarksBezierFunctionSegment[];
	a?: number;
	b?: number;
	value?: number;
}

export type IQuarksRotation = IQuarksEulerRotation | IQuarksValue;

/**
 * Quarks gradient key
 */
export interface IQuarksGradientKey {
	time?: number;
	value: number | [number, number, number, number] | IQuarksRGBA;
	pos?: number;
}

/**
 * Quarks shape configuration
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
 * Quarks emission burst
 */
export interface IQuarksEmissionBurst {
	time: IQuarksValue;
	count: IQuarksValue;
	cycle?: number;
	interval?: number;
	probability?: number;
}

/**
 * Quarks behavior types
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
	color?: IQuarksRGBA;
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
		functions?: IQuarksBezierFunctionSegment[];
		type?: string;
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

/**
 * Base interface for speed-based behaviors
 */
interface IQuarksSpeedBasedBehavior {
	minSpeed?: IQuarksValue;
	maxSpeed?: IQuarksValue;
}

export interface IQuarksColorBySpeedBehavior extends IQuarksSpeedBasedBehavior {
	type: "ColorBySpeed";
	color?: {
		keys: IQuarksGradientKey[];
	};
}

export interface IQuarksSizeBySpeedBehavior extends IQuarksSpeedBasedBehavior {
	type: "SizeBySpeed";
	size?: {
		keys: IQuarksGradientKey[];
	};
}

export interface IQuarksRotationBySpeedBehavior extends IQuarksSpeedBasedBehavior {
	type: "RotationBySpeed";
	angularVelocity?: IQuarksValue;
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

export interface IQuarksNoiseBehavior {
	type: "Noise";
	frequency?: IQuarksValue;
	power?: IQuarksValue;
	positionAmount?: IQuarksValue;
	rotationAmount?: IQuarksValue;
	x?: IQuarksValue;
	y?: IQuarksValue;
	z?: IQuarksValue;
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
	| IQuarksNoiseBehavior
	| { type: string; [key: string]: unknown }; // Fallback for unknown behaviors

/**
 * Quarks start size with Vector3Function support
 */
export interface IQuarksVector3FunctionSize {
	type: "Vector3Function";
	x?: IQuarksValue;
	y?: IQuarksValue;
	z?: IQuarksValue;
	functions?: IQuarksBezierFunctionSegment[];
	a?: number;
	b?: number;
	value?: number;
}

export type IQuarksStartSize = IQuarksValue | IQuarksVector3FunctionSize;

/**
 * Quarks start color with Gradient and ColorRange support
 */
export interface IQuarksGradientStartColor {
	type: "Gradient";
	alpha?: IQuarksCLinearFunction;
	color?: IQuarksCLinearFunction;
}

export interface IQuarksColorRangeStartColor {
	type: "ColorRange";
	a?: IQuarksRGBA;
	b?: IQuarksRGBA;
	color?: IQuarksCLinearFunction;
	alpha?: IQuarksCLinearFunction;
}

export type IQuarksStartColor = IQuarksColor | IQuarksGradientStartColor | IQuarksColorRangeStartColor;

/**
 * Quarks particle emitter configuration
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
	startSize?: IQuarksStartSize;
	startColor?: IQuarksStartColor;
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
 * Base interface for Quarks objects with common transform properties
 */
interface IQuarksObjectBase {
	uuid: string;
	name: string;
	matrix: number[];
	layers: number;
	up: number[];
	children: IQuarksObject[];
	position?: number[];
	rotation?: number[];
	scale?: number[];
}

/**
 * Quarks object types
 */
export interface IQuarksGroup extends IQuarksObjectBase {
	type: "Group";
}

export interface IQuarksParticleEmitter extends IQuarksObjectBase {
	type: "ParticleEmitter";
	ps: IQuarksParticleEmitterConfig;
}

export type IQuarksObject = IQuarksGroup | IQuarksParticleEmitter;

/**
 * Base interface for Quarks resources (materials, textures, images, geometries)
 */
interface IQuarksResource {
	uuid: string;
	name?: string;
}

/**
 * Quarks material
 */
export interface IQuarksMaterial extends IQuarksResource {
	type: string;
	color?: number;
	map?: string;
	blending?: number;
	blendColor?: number;
	side?: number;
	transparent?: boolean;
	depthWrite?: boolean;
	envMapRotation?: number[];
	reflectivity?: number;
	refractionRatio?: number;
}

/**
 * Quarks texture
 */
export interface IQuarksTexture extends IQuarksResource {
	image?: string;
	mapping?: number;
	wrap?: number[];
	repeat?: number[];
	offset?: number[];
	center?: number[];
	rotation?: number;
	minFilter?: number;
	magFilter?: number;
	flipY?: boolean;
	generateMipmaps?: boolean;
	format?: number;
	internalFormat?: number | null;
	type?: number;
	channel?: number;
	anisotropy?: number;
	colorSpace?: string;
	premultiplyAlpha?: boolean;
	unpackAlignment?: number;
}

/**
 * Quarks image
 */
export interface IQuarksImage extends IQuarksResource {
	url?: string;
}

/**
 * Quarks geometry
 */
export interface IQuarksGeometry extends IQuarksResource {
	type: string;
	data?: {
		attributes?: Record<
			string,
			{
				itemSize: number;
				type: string;
				array: number[];
				normalized?: boolean;
			}
		>;
		index?: {
			type: string;
			array: number[];
		};
	};
	// Geometry-specific properties (for different geometry types)
	height?: number;
	heightSegments?: number;
	width?: number;
	widthSegments?: number;
	radius?: number;
	phiLength?: number;
	phiStart?: number;
	thetaLength?: number;
	thetaStart?: number;
}

/**
 * Quarks JSON structure
 */
export interface IQuarksJSON {
	metadata: {
		version: number;
		type: string;
		generator: string;
	};
	geometries: IQuarksGeometry[];
	materials: IQuarksMaterial[];
	textures: IQuarksTexture[];
	images: IQuarksImage[];
	object: IQuarksObject;
}
