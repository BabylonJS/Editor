import { Color4, ParticleSystem, Scene } from "babylonjs";
import type { VFXValueParser } from "../parsers/VFXValueParser";
import type { VFXPerParticleBehaviorFunction } from "../types/VFXBehaviorFunction";

/**
 * Extended ParticleSystem with VFX behaviors support
 * (logic intentionally minimal, behaviors handled elsewhere)
 */
export class VFXParticleSystem extends ParticleSystem {
	public startSize: number;
	public startSpeed: number;
	public startColor: Color4;
	public behaviors: VFXPerParticleBehaviorFunction[];
	constructor(name: string, capacity: number, scene: Scene, _valueParser: VFXValueParser, _avgStartSpeed: number, _avgStartSize: number, _startColor: Color4) {
		super(name, capacity, scene);
		// behavior wiring omitted by design (see VFXEmitterFactory)
	}

	public setPerParticleBehaviors(functions: VFXPerParticleBehaviorFunction[]): void {
		this.behaviors = functions;
	}
}
