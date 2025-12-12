/**
 * VFX Types - Centralized type definitions
 *
 * This module exports all VFX-related types organized by category.
 * Import types directly from their specific modules for better tree-shaking.
 */

// Loader and context types
export type { VFXLoaderOptions } from "./loader";
export type { VFXParseContext } from "./context";

// Emitter types
export type { VFXEmitterData } from "./emitter";

// Factory interfaces
export type { IVFXMaterialFactory, IVFXGeometryFactory, IVFXEmitterFactory, IVFXValueParser } from "./factories";

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
export type { VFXTransform, VFXGroup, VFXEmitter, VFXHierarchy } from "./hierarchy";
export type { QuarksVFXJSON } from "./quarksTypes";
export type { VFXPerParticleContext, VFXPerParticleBehaviorFunction, VFXPerSolidParticleBehaviorFunction, VFXSystemBehaviorFunction } from "./VFXBehaviorFunction";
