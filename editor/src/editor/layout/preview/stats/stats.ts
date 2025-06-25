import { EngineInstrumentation, SceneInstrumentation, Observable } from "babylonjs";

import { Editor } from "../../../main";

import { StatsValuesType } from "./types";

export class Stats {
	/**
     * Defines the observable called when the stats values have been updated.
     */
	public onValuesChangedObservable: Observable<StatsValuesType> = new Observable();

	private _editor: Editor;
	private _intervalId: number;

	private _values: StatsValuesType = {};

	private _engineInstrumentation: EngineInstrumentation;
	private _sceneInstrumentation: SceneInstrumentation;

	public constructor(editor: Editor) {
		this._editor = editor;

		this._sceneInstrumentation = new SceneInstrumentation(this._editor.layout.preview.scene);
		this._sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
		this._sceneInstrumentation.captureRenderTargetsRenderTime = true;
		this._sceneInstrumentation.captureFrameTime = true;
		this._sceneInstrumentation.captureRenderTime = true;
		this._sceneInstrumentation.captureInterFrameTime = true;
		this._sceneInstrumentation.captureParticlesRenderTime = true;
		this._sceneInstrumentation.capturePhysicsTime = true;

		this._engineInstrumentation = new EngineInstrumentation(this._editor.layout.preview.engine);
		this._engineInstrumentation.captureGPUFrameTime = true;

		this._computeStats();

		this._intervalId = window.setInterval(() => {
			this._computeStats();
		}, 150);
	}

	public dispose(): void {
		window.clearInterval(this._intervalId);

		this._sceneInstrumentation.dispose();
		this._engineInstrumentation.dispose();
	}

	private _computeStats(): void {
		const p = this._editor.layout.preview.engine.performanceMonitor;
		const s = this._editor.layout.preview.scene!;

		this._values.averageFPS = p.averageFPS;
		this._values.instantaneousFPS = p.instantaneousFPS;

		this._values.averageFrameTime = p.averageFrameTime;
		this._values.instantaneousFrameTime = p.instantaneousFrameTime;

		this._values.activeFaces = s.getActiveIndices() / 3;
		this._values.activeIndices = s.getActiveIndices();
		this._values.activeBones = s.getActiveBones();
		this._values.activeParticles = s.getActiveParticles();

		this._values.activeMeshes = s.getActiveMeshes().length;
		this._values.drawCalls = this._sceneInstrumentation!.drawCallsCounter.current;

		this._values.totalVertices = s.getTotalVertices();

		this._values.totalMeshes = s.meshes.length;
		this._values.totalMaterials = s.materials.length;
		this._values.totalTextures = s.textures.length;
		this._values.totalLights = s.lights.length;

		if (this._engineInstrumentation.gpuFrameTimeCounter) {
			this._values.gpuFrameTime = this._engineInstrumentation.gpuFrameTimeCounter.lastSecAverage * 0.000001;
			this._values.gpuFrameTimeAvarage = this._engineInstrumentation.gpuFrameTimeCounter.average * 0.000001;
		}

		this._values.absoluteFPS = 1000 / this._sceneInstrumentation!.frameTimeCounter.lastSecAverage;
		this._values.render = this._sceneInstrumentation?.renderTimeCounter.lastSecAverage;
		this._values.frameTotal = this._sceneInstrumentation?.frameTimeCounter.lastSecAverage;
		this._values.interFrame = this._sceneInstrumentation?.interFrameTimeCounter.lastSecAverage;

		this._values.meshSelection = this._sceneInstrumentation?.activeMeshesEvaluationTimeCounter.lastSecAverage;
		this._values.renderTargets = this._sceneInstrumentation?.renderTargetsRenderTimeCounter.lastSecAverage;
		this._values.animations = this._sceneInstrumentation?.animationsTimeCounter.lastSecAverage;
		this._values.particles = this._sceneInstrumentation?.physicsTimeCounter.lastSecAverage;
		this._values.physics = this._sceneInstrumentation?.physicsTimeCounter.lastSecAverage;

		this.onValuesChangedObservable.notifyObservers(this._values);
	}
}
