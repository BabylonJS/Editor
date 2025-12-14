import type { VFXValue } from "./values";
import type { VFXColor } from "./colors";
import type { VFXRotation } from "./rotations";
import type { VFXShape } from "./shapes";
import type { VFXBehavior } from "./behaviors";

/**
 * VFX emission burst (converted from Quarks)
 */
export interface VFXEmissionBurst {
	time: VFXValue;
	count: VFXValue;
}

/**
 * VFX particle emitter configuration (converted from Quarks)
 */
export interface VFXParticleEmitterConfig {
	version?: string;
	autoDestroy?: boolean;
	looping?: boolean;
	prewarm?: boolean;
	duration?: number;
	shape?: VFXShape;
	startLife?: VFXValue;
	startSpeed?: VFXValue;
	startRotation?: VFXRotation;
	startSize?: VFXValue;
	startColor?: VFXColor;
	emissionOverTime?: VFXValue;
	emissionOverDistance?: VFXValue;
	emissionBursts?: VFXEmissionBurst[];
	onlyUsedByOther?: boolean;
	instancingGeometry?: string;
	renderOrder?: number;
	systemType: "solid" | "base"; // Determined from renderMode: 2 = solid, otherwise base
	rendererEmitterSettings?: Record<string, unknown>;
	material?: string;
	layers?: number;
	// Billboard settings (converted from renderMode)
	isBillboardBased?: boolean;
	billboardMode?: number; // ParticleSystem.BILLBOARDMODE_*
	startTileIndex?: VFXValue;
	uTileCount?: number;
	vTileCount?: number;
	blendTiles?: boolean;
	softParticles?: boolean;
	softFarFade?: number;
	softNearFade?: number;
	behaviors?: VFXBehavior[];
	worldSpace?: boolean;
}
