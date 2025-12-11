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
    renderMode?: number;
    rendererEmitterSettings?: Record<string, unknown>;
    material?: string;
    layers?: number;
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

