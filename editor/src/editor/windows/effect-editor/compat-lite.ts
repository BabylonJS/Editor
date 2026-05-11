import { Constants } from "@babylonjs/core/Engines/constants";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { BehaviorFromJSON, ConstantColor, ConstantValue, ParticleSystem, RenderMode } from "babylon.quarks";

export type BehaviorKind = "system" | "perParticle";
export type Value = any;
export type Color = any;
export type Rotation = any;
export type Behavior = Record<string, any>;

export interface IConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface IIntervalValue {
	type: "IntervalValue";
	min: number;
	max: number;
}

export interface IEulerRotation {
	type: "Euler";
	angleX?: Value;
	angleY?: Value;
	angleZ?: Value;
	order?: string;
}

export interface IAxisAngleRotation {
	type: "AxisAngle";
	x?: Value;
	y?: Value;
	z?: Value;
	angle?: Value;
}

export interface IRandomQuatRotation {
	type: "RandomQuat";
}

export interface IEmissionBurst {
	time: Value;
	count: Value;
	cycle?: number;
	interval?: number;
	probability?: number;
}

export const BEHAVIOR_TYPES = {
	ApplyForce: "ApplyForce",
	Noise: "Noise",
	TurbulenceField: "TurbulenceField",
	GravityForce: "GravityForce",
	ColorOverLife: "ColorOverLife",
	RotationOverLife: "RotationOverLife",
	Rotation3DOverLife: "Rotation3DOverLife",
	SizeOverLife: "SizeOverLife",
	ColorBySpeed: "ColorBySpeed",
	RotationBySpeed: "RotationBySpeed",
	SizeBySpeed: "SizeBySpeed",
	SpeedOverLife: "SpeedOverLife",
	FrameOverLife: "FrameOverLife",
	ForceOverLife: "ForceOverLife",
	OrbitOverLife: "OrbitOverLife",
	WidthOverLength: "WidthOverLength",
	ChangeEmitDirection: "ChangeEmitDirection",
	EmitSubParticleSystem: "EmitSubParticleSystem",
	LimitSpeedOverLife: "LimitSpeedOverLife",
} as const;

type SolidShapeType = "solid-sphere" | "solid-cone" | "solid-box" | "solid-hemisphere" | "solid-cylinder";
type SolidEmitterData = { __solidShapeType: SolidShapeType; [key: string]: any };
type BaseEmitterData = { getClassName: () => string; [key: string]: any };
type CompatMeta = {
	particleEmitterType: SolidEmitterData | BaseEmitterData;
	behaviorConfigs: Behavior[];
	emissionBursts: IEmissionBurst[];
	mesh: any | null;
	minInitialRotation: number;
	maxInitialRotation: number;
	minAngularSpeed: number;
	maxAngularSpeed: number;
	minScaleX: number;
	maxScaleX: number;
	minScaleY: number;
	maxScaleY: number;
	color1: Color4;
	color2: Color4;
	colorDead: Color4;
	startSpriteCellID: number;
	billboardMode: number;
	preWarmCycles: number;
	preWarmStepOffset: number;
	isLocal: boolean;
};

const metaMap = new WeakMap<ParticleSystem, CompatMeta>();
const proxyMap = new WeakMap<ParticleSystem, any>();

const solidEmitter = (shapeType: SolidShapeType, values: Record<string, any>): SolidEmitterData => ({ __solidShapeType: shapeType, ...values });

function toConstant(value: any, fallback: number): number {
	if (typeof value === "number") return value;
	if (!value || typeof value !== "object") return fallback;
	if (value.type === "ConstantValue") return Number(value.value ?? fallback);
	if (value.type === "IntervalValue") return Number(((value.min ?? fallback) + (value.max ?? fallback)) * 0.5);
	return fallback;
}

function toInterval(value: any, fallback: number): { min: number; max: number } {
	if (!value || typeof value !== "object") return { min: fallback, max: fallback };
	if (value.type === "IntervalValue") return { min: Number(value.min ?? fallback), max: Number(value.max ?? fallback) };
	const constant = toConstant(value, fallback);
	return { min: constant, max: constant };
}

function toColor4(value: any, fallback: Color4 = new Color4(1, 1, 1, 1)): Color4 {
	if (value instanceof Color4) return value;
	if (value?.type === "ConstantColor" && Array.isArray(value.value)) return new Color4(value.value[0], value.value[1], value.value[2], value.value[3]);
	if (value?.type === "ColorRange" && value.colorA?.length >= 4) return new Color4(value.colorA[0], value.colorA[1], value.colorA[2], value.colorA[3]);
	if (value?.type === "Gradient" && value.colorKeys?.length) {
		const first = value.colorKeys[0]?.value ?? [1, 1, 1, 1];
		return new Color4(first[0], first[1], first[2], first[3]);
	}
	return fallback.clone();
}

function ensureMeta(system: ParticleSystem): CompatMeta {
	const found = metaMap.get(system);
	if (found) return found;
	const created: CompatMeta = {
		particleEmitterType:
			system.renderMode === RenderMode.Mesh
				? solidEmitter("solid-sphere", { radius: 1, arc: Math.PI * 2, thickness: 1 })
				: { getClassName: () => "PointParticleEmitter", direction1: Vector3.Zero(), direction2: Vector3.Zero() },
		behaviorConfigs: [...(system.behaviors ?? [])],
		emissionBursts: [],
		mesh: null,
		minInitialRotation: 0,
		maxInitialRotation: 0,
		minAngularSpeed: 0,
		maxAngularSpeed: 0,
		minScaleX: 1,
		maxScaleX: 1,
		minScaleY: 1,
		maxScaleY: 1,
		color1: toColor4((system as any).startColor),
		color2: new Color4(1, 1, 1, 1),
		colorDead: new Color4(1, 1, 1, 0),
		startSpriteCellID: 0,
		billboardMode: 0,
		preWarmCycles: 0,
		preWarmStepOffset: 1 / 60,
		isLocal: !system.worldSpace,
	};
	metaMap.set(system, created);
	return created;
}

export function createParticleUiProxy(system: ParticleSystem): any {
	const cached = proxyMap.get(system);
	if (cached) return cached;
	const proxy: any = {
		get particleEmitterType() { return ensureMeta(system).particleEmitterType; },
		set particleEmitterType(value: any) { ensureMeta(system).particleEmitterType = value; },
		get behaviorConfigs() { return ensureMeta(system).behaviorConfigs; },
		set behaviorConfigs(value: Behavior[]) { ensureMeta(system).behaviorConfigs = value ?? []; },
		get emissionBursts() { return ensureMeta(system).emissionBursts; },
		set emissionBursts(value: IEmissionBurst[]) { ensureMeta(system).emissionBursts = value ?? []; },
		get mesh() { return ensureMeta(system).mesh; },
		set mesh(value: any) { ensureMeta(system).mesh = value; },
		get color1() { return ensureMeta(system).color1; },
		set color1(value: Color4) { ensureMeta(system).color1 = value; system.startColor = new ConstantColor({ x: value.r, y: value.g, z: value.b, w: value.a } as any); },
		get color2() { return ensureMeta(system).color2; },
		set color2(value: Color4) { ensureMeta(system).color2 = value; },
		get colorDead() { return ensureMeta(system).colorDead; },
		set colorDead(value: Color4) { ensureMeta(system).colorDead = value; },
		get minInitialRotation() { return ensureMeta(system).minInitialRotation; },
		set minInitialRotation(value: number) { ensureMeta(system).minInitialRotation = value; },
		get maxInitialRotation() { return ensureMeta(system).maxInitialRotation; },
		set maxInitialRotation(value: number) { ensureMeta(system).maxInitialRotation = value; },
		get minAngularSpeed() { return ensureMeta(system).minAngularSpeed; },
		set minAngularSpeed(value: number) { ensureMeta(system).minAngularSpeed = value; },
		get maxAngularSpeed() { return ensureMeta(system).maxAngularSpeed; },
		set maxAngularSpeed(value: number) { ensureMeta(system).maxAngularSpeed = value; },
		get minScaleX() { return ensureMeta(system).minScaleX; },
		set minScaleX(value: number) { ensureMeta(system).minScaleX = value; },
		get maxScaleX() { return ensureMeta(system).maxScaleX; },
		set maxScaleX(value: number) { ensureMeta(system).maxScaleX = value; },
		get minScaleY() { return ensureMeta(system).minScaleY; },
		set minScaleY(value: number) { ensureMeta(system).minScaleY = value; },
		get maxScaleY() { return ensureMeta(system).maxScaleY; },
		set maxScaleY(value: number) { ensureMeta(system).maxScaleY = value; },
		get particleTexture() { return system.texture; },
		set particleTexture(value: any) { system.texture = value; },
		get renderingGroupId() { return system.renderOrder; },
		set renderingGroupId(value: number) { system.renderOrder = value; },
		get blendMode() { return system.blending; },
		set blendMode(value: number) { system.blending = value === 0 ? Constants.ALPHA_ADD : value === 1 ? Constants.ALPHA_MULTIPLY : value === 3 ? Constants.ALPHA_ONEONE : Constants.ALPHA_COMBINE; },
		get spriteCellWidth() { return system.uTileCount; },
		set spriteCellWidth(value: number) { system.uTileCount = Math.max(1, value); },
		get spriteCellHeight() { return system.vTileCount; },
		set spriteCellHeight(value: number) { system.vTileCount = Math.max(1, value); },
		get minSize() { return toInterval((system as any).startSize, 1).min; },
		set minSize(value: number) { const i = toInterval((system as any).startSize, 1); (system as any).startSize = { type: "IntervalValue", min: value, max: i.max }; },
		get maxSize() { return toInterval((system as any).startSize, 1).max; },
		set maxSize(value: number) { const i = toInterval((system as any).startSize, 1); (system as any).startSize = { type: "IntervalValue", min: i.min, max: value }; },
		get minLifeTime() { return toInterval((system as any).startLife, 1).min; },
		set minLifeTime(value: number) { const i = toInterval((system as any).startLife, 1); (system as any).startLife = { type: "IntervalValue", min: value, max: i.max }; },
		get maxLifeTime() { return toInterval((system as any).startLife, 1).max; },
		set maxLifeTime(value: number) { const i = toInterval((system as any).startLife, 1); (system as any).startLife = { type: "IntervalValue", min: i.min, max: value }; },
		get minEmitPower() { return toInterval((system as any).startSpeed, 1).min; },
		set minEmitPower(value: number) { const i = toInterval((system as any).startSpeed, 1); (system as any).startSpeed = { type: "IntervalValue", min: value, max: i.max }; },
		get maxEmitPower() { return toInterval((system as any).startSpeed, 1).max; },
		set maxEmitPower(value: number) { const i = toInterval((system as any).startSpeed, 1); (system as any).startSpeed = { type: "IntervalValue", min: i.min, max: value }; },
		get emitRate() { return toConstant((system as any).emissionOverTime, 0); },
		set emitRate(value: number) { (system as any).emissionOverTime = new ConstantValue(value); },
		get targetStopDuration() { return system.looping ? 0 : system.duration; },
		set targetStopDuration(value: number) { if (value === 0) { system.looping = true; } else { system.looping = false; system.duration = Math.max(0.01, value); } },
		get isLocal() { return ensureMeta(system).isLocal; },
		set isLocal(value: boolean) { ensureMeta(system).isLocal = value; system.worldSpace = !value; },
		get preWarmCycles() { return ensureMeta(system).preWarmCycles; },
		set preWarmCycles(value: number) { ensureMeta(system).preWarmCycles = value; },
		get preWarmStepOffset() { return ensureMeta(system).preWarmStepOffset; },
		set preWarmStepOffset(value: number) { ensureMeta(system).preWarmStepOffset = value; },
		createPointEmitter(direction1: any = Vector3.Zero(), direction2: any = Vector3.Zero()) { ensureMeta(system).particleEmitterType = { direction1, direction2, getClassName: () => "PointParticleEmitter" }; },
		createBoxEmitter(direction1: any = Vector3.Zero(), direction2: any = Vector3.Zero(), minEmitBox: any = new Vector3(-0.5, -0.5, -0.5), maxEmitBox: any = new Vector3(0.5, 0.5, 0.5)) {
			ensureMeta(system).particleEmitterType = system.renderMode === RenderMode.Mesh ? solidEmitter("solid-box", { direction1, direction2, minEmitBox, maxEmitBox }) : { direction1, direction2, minEmitBox, maxEmitBox, getClassName: () => "BoxParticleEmitter" };
		},
		createSphereEmitter(radius: number = 1, arc: number = Math.PI * 2, thickness: number = 1) {
			ensureMeta(system).particleEmitterType = system.renderMode === RenderMode.Mesh ? solidEmitter("solid-sphere", { radius, arc, thickness }) : { radius, radiusRange: 1, directionRandomizer: 0, getClassName: () => "SphereParticleEmitter" };
		},
		createConeEmitter(radius: number = 1, arcOrAngle: number = Math.PI / 6, thickness: number = 1, angleMaybe?: number) {
			ensureMeta(system).particleEmitterType = system.renderMode === RenderMode.Mesh ? solidEmitter("solid-cone", { radius, arc: arcOrAngle, thickness, angle: angleMaybe ?? Math.PI / 6 }) : { radius, angle: arcOrAngle, radiusRange: 1, heightRange: 1, emitFromSpawnPointOnly: false, getClassName: () => "ConeParticleEmitter" };
		},
		createHemisphericEmitter(radius: number = 1, radiusRange: number = 1, directionRandomizer: number = 0) {
			ensureMeta(system).particleEmitterType = system.renderMode === RenderMode.Mesh ? solidEmitter("solid-hemisphere", { radius, radiusRange, directionRandomizer }) : { radius, radiusRange, directionRandomizer, getClassName: () => "HemisphericParticleEmitter" };
		},
		createCylinderEmitter(radius: number = 1, height: number = 1, radiusRange: number = 1, directionRandomizer: number = 0) {
			ensureMeta(system).particleEmitterType = system.renderMode === RenderMode.Mesh ? solidEmitter("solid-cylinder", { radius, height, radiusRange, directionRandomizer }) : { radius, height, radiusRange, directionRandomizer, getClassName: () => "CylinderParticleEmitter" };
		},
		replaceParticleMesh(mesh: any) { ensureMeta(system).mesh = mesh; },
		setBehaviors(behaviors: Behavior[]) {
			const safe = behaviors ?? [];
			ensureMeta(system).behaviorConfigs = safe;
			system.behaviors = safe
				.map((behavior: any) => BehaviorFromJSON(behavior?.toJSON?.() ?? behavior, system))
				.filter((behavior): behavior is any => !!behavior);
		},
	};
	proxyMap.set(system, proxy);
	return proxy;
}

export const isSystem = (data: unknown): data is ParticleSystem => data instanceof ParticleSystem;
export const isSolidParticleSystem = (instance: unknown): instance is ParticleSystem => instance instanceof ParticleSystem && instance.renderMode === RenderMode.Mesh;
export const isBaseParticleSystem = (instance: unknown): instance is ParticleSystem => instance instanceof ParticleSystem && !isSolidParticleSystem(instance);
export const parseConstantValue = (value: Value): number => toConstant(value, 0);
export const parseIntervalValue = (value: Value): { min: number; max: number } => toInterval(value, 0);
export const parseConstantColor = (color: Color): Color4 => toColor4(color);
export const isSolidSphereEmitter = (emitter: unknown): emitter is SolidEmitterData => !!emitter && typeof emitter === "object" && (emitter as SolidEmitterData).__solidShapeType === "solid-sphere";
export const isSolidConeEmitter = (emitter: unknown): emitter is SolidEmitterData => !!emitter && typeof emitter === "object" && (emitter as SolidEmitterData).__solidShapeType === "solid-cone";
export const isSolidBoxEmitter = (emitter: unknown): emitter is SolidEmitterData => !!emitter && typeof emitter === "object" && (emitter as SolidEmitterData).__solidShapeType === "solid-box";
export const isSolidHemisphericEmitter = (emitter: unknown): emitter is SolidEmitterData => !!emitter && typeof emitter === "object" && (emitter as SolidEmitterData).__solidShapeType === "solid-hemisphere";
export const isSolidCylinderEmitter = (emitter: unknown): emitter is SolidEmitterData => !!emitter && typeof emitter === "object" && (emitter as SolidEmitterData).__solidShapeType === "solid-cylinder";

