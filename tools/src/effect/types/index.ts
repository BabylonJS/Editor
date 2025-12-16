/**
 *  Types - Centralized type definitions
 *
 * This module exports all -related types organized by category.
 * Import types directly from their specific modules for better tree-shaking.
 */

// Loader types
export type { LoaderOptions } from "./loader";

// Emitter types
export type { EmitterData } from "./emitter";

// Factory interfaces
export type { IMaterialFactory, IGeometryFactory } from "./factories";

// Core  types
export type { ConstantValue, IntervalValue, Value } from "./values";
export type { ConstantColor, Color } from "./colors";
export type { EulerRotation, Rotation } from "./rotations";
export type { GradientKey } from "./gradients";
export type { Shape } from "./shapes";
export type {
	ColorOverLifeBehavior,
	SizeOverLifeBehavior,
	RotationOverLifeBehavior,
	ForceOverLifeBehavior,
	GravityForceBehavior,
	SpeedOverLifeBehavior,
	FrameOverLifeBehavior,
	LimitSpeedOverLifeBehavior,
	ColorBySpeedBehavior,
	SizeBySpeedBehavior,
	RotationBySpeedBehavior,
	OrbitOverLifeBehavior,
	Behavior,
} from "./behaviors";
export type { EmissionBurst, EmitterConfig } from "./emitter";
export type { Transform, Group, Emitter, Data } from "./hierarchy";
export type { Material, Texture, Image, Geometry } from "./resources";
export type { ISolidParticleEmitterType } from "./emitter";
export { SolidPointParticleEmitter, SolidSphereParticleEmitter, SolidConeParticleEmitter } from "../emitters";
export type { QuarksJSON } from "./quarksTypes";
export type { PerParticleBehaviorFunction, PerSolidParticleBehaviorFunction, SystemBehaviorFunction } from "./behaviors";
export type { ISystem, ParticleWithSystem, SolidParticleWithSystem } from "./system";
export { isSystem } from "./system";
