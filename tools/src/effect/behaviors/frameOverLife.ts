import type { IFrameOverLifeBehavior } from "../types/behaviors";
import { ValueUtils } from "../utils/valueParser";
import type { EffectParticleSystem } from "../systems/effectParticleSystem";
/**
 * Apply FrameOverLife behavior to ParticleSystem
 */
export function applyFrameOverLifePS(particleSystem: EffectParticleSystem, behavior: IFrameOverLifeBehavior): void {
	if (!behavior.frame) {
		return;
	}

	particleSystem.isAnimationSheetEnabled = true;
	if (typeof behavior.frame === "object" && behavior.frame !== null && "keys" in behavior.frame && behavior.frame.keys && Array.isArray(behavior.frame.keys)) {
		const frames = behavior.frame.keys.map((k) => {
			const val = k.value;
			const pos = k.pos ?? k.time ?? 0;
			if (typeof val === "number") {
				return val;
			}
			if (Array.isArray(val)) {
				return val[0] || 0;
			}
			return pos;
		});
		if (frames.length > 0) {
			particleSystem.startSpriteCellID = Math.floor(frames[0]);
			particleSystem.endSpriteCellID = Math.floor(frames[frames.length - 1] || frames[0]);
		}
	} else if (typeof behavior.frame === "number" || (typeof behavior.frame === "object" && behavior.frame !== null && "type" in behavior.frame)) {
		const frameValue = ValueUtils.parseConstantValue(behavior.frame);
		particleSystem.startSpriteCellID = Math.floor(frameValue);
		particleSystem.endSpriteCellID = Math.floor(frameValue);
	}
}
