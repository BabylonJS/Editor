/**
 * VFX Types - Centralized type definitions
 *
 * This module exports all VFX-related types organized by category.
 * Import types directly from their specific modules for better tree-shaking.
 */

// Loader types
export type { VFXLoaderOptions } from "./loader";

// Emitter types
export type { VFXEmitterData } from "./emitter";

// Factory interfaces
export type { IVFXMaterialFactory, IVFXGeometryFactory } from "./factories";

// Core VFX types
export type { VFXConstantValue, VFXIntervalValue, VFXValue } from "./values";
export type { VFXConstantColor, VFXColor } from "./colors";
export type { VFXEulerRotation, VFXRotation } from "./rotations";
export type { VFXGradientKey } from "./gradients";
export type { VFXShape } from "./shapes";
export type {
	VFXColorOverLifeBehavior,
	VFXSizeOverLifeBehavior,
	VFXRotationOverLifeBehavior,
	VFXForceOverLifeBehavior,
	VFXGravityForceBehavior,
	VFXSpeedOverLifeBehavior,
	VFXFrameOverLifeBehavior,
	VFXLimitSpeedOverLifeBehavior,
	VFXColorBySpeedBehavior,
	VFXSizeBySpeedBehavior,
	VFXRotationBySpeedBehavior,
	VFXOrbitOverLifeBehavior,
	VFXBehavior,
} from "./behaviors";
export type { VFXEmissionBurst, VFXParticleEmitterConfig } from "./emitterConfig";
export type { VFXTransform, VFXGroup, VFXEmitter, VFXData } from "./hierarchy";
export type { VFXMaterial, VFXTexture, VFXImage, VFXGeometry } from "./resources";
export type { QuarksVFXJSON } from "./quarksTypes";
export type { VFXPerParticleContext, VFXPerParticleBehaviorFunction, VFXPerSolidParticleBehaviorFunction, VFXSystemBehaviorFunction } from "./VFXBehaviorFunction";
export type { IVFXSystem, ParticleWithSystem, SolidParticleWithSystem } from "./system";
export { isVFXSystem } from "./system";
