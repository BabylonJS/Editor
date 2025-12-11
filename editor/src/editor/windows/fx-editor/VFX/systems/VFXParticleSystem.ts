import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem, Scene } from "@babylonjs/core";
import type { VFXValueParser } from "../parsers/VFXValueParser";
import type { VFXPerParticleBehaviorFunction } from "../types/VFXBehaviorFunction";


/**
 * Extended ParticleSystem with VFX behaviors support
 * (logic intentionally minimal, behaviors handled elsewhere)
 */
export class VFXParticleSystem extends ParticleSystem {
    constructor(name: string, capacity: number, scene: Scene, _valueParser: VFXValueParser, _avgStartSpeed: number, _avgStartSize: number, _startColor: Color4) {
        super(name, capacity, scene);
        // behavior wiring omitted by design (see VFXEmitterFactory)
    }

    public setPerParticleBehaviors(_functions: VFXPerParticleBehaviorFunction[]): void {
        // intentionally no-op (kept for API parity)
    }
}

