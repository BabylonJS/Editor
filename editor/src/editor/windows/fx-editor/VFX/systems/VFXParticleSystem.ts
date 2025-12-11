import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { Scene } from "@babylonjs/core/scene";
import type { VFXValueParser } from "../parsers/VFXValueParser";
import type { VFXPerParticleBehaviorFunction } from "../types/VFXBehaviorFunction";

/**
 * Extended ParticleSystem with VFX behaviors support
 * (logic intentionally minimal, behaviors handled elsewhere)
 */
export class VFXParticleSystem extends ParticleSystem {
    constructor(name: string, capacity: number, scene: Scene, valueParser: VFXValueParser, avgStartSpeed: number, avgStartSize: number, startColor: Color4) {
        super(name, capacity, scene);
        // behavior wiring omitted by design (see VFXEmitterFactory)
    }

    public setPerParticleBehaviors(functions: VFXPerParticleBehaviorFunction[]): void {
        // intentionally no-op (kept for API parity)
    }
}

