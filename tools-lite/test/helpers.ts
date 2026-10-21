import { createNullEngine, createSceneContext, EngineContext, SceneContext, stepScene } from "@babylonjs/lite";

/**
 * Creates a Babylon Lite scene running without GPU (null engine), driven by `stepTestScene`.
 */
export function createTestScene(): { engine: EngineContext; scene: SceneContext } {
	const engine = createNullEngine();
	const scene = createSceneContext(engine, { defaultRenderTask: false });

	return { engine, scene };
}

/**
 * Advances the given scene by the given number of frames.
 */
export function stepTestScene(engine: EngineContext, scene: SceneContext, frames: number = 1, deltaMs: number = 1000 / 60): void {
	for (let i = 0; i < frames; ++i) {
		stepScene(engine, scene, deltaMs);
	}
}
