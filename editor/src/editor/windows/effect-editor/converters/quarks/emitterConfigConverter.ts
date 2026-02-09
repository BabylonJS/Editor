import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { IQuarksParticleEmitterConfig } from "./types";
import type { IParticleSystemConfig } from "babylonjs-editor-tools";
import {
	DEFAULT_DURATION,
	DEFAULT_PREWARM_STEP_OFFSET,
	PREWARM_FPS,
} from "./constants";
import {
	convertValue,
	convertValueToMinMax,
	convertStartSizeToMinMax,
	convertRotationToMinMax,
} from "./valueConverter";
import { convertStartColorToColor4 } from "./colorConverter";
import { convertShape } from "./resourceConverter";
import { convertBehavior } from "./behaviorConverter";

/**
 * Convert emitter config from IQuarks to format
 */
export function convertEmitterConfig(config: IQuarksParticleEmitterConfig): IParticleSystemConfig {
	const result = convertBasicEmitterConfig(config);
	convertLifeProperties(config, result);
	convertEmissionProperties(config, result);
	convertVisualProperties(config, result);
	convertBehaviorsAndShape(config, result);
	convertBillboardConfig(config, result);
	return result;
}

/**
 * Convert basic emitter configuration (system type, duration, prewarm, etc.)
 */
function convertBasicEmitterConfig(config: IQuarksParticleEmitterConfig): IParticleSystemConfig {
	const systemType: "solid" | "base" = config.renderMode === 2 ? "solid" : "base";
	const duration = config.duration ?? DEFAULT_DURATION;
	const targetStopDuration = config.looping ? 0 : duration;

	// Convert prewarm to native preWarmCycles
	let preWarmCycles = 0;
	let preWarmStepOffset = DEFAULT_PREWARM_STEP_OFFSET;
	if (config.prewarm) {
		preWarmCycles = Math.ceil(duration * PREWARM_FPS);
		preWarmStepOffset = DEFAULT_PREWARM_STEP_OFFSET;
	}

	const isLocal = config.worldSpace === undefined ? false : !config.worldSpace;
	const disposeOnStop = config.autoDestroy ?? false;

	return {
		version: config.version,
		systemType,
		targetStopDuration,
		preWarmCycles,
		preWarmStepOffset,
		isLocal,
		disposeOnStop,
		instancingGeometry: config.instancingGeometry,
		renderOrder: config.renderOrder,
		layers: config.layers,
		uTileCount: config.uTileCount,
		vTileCount: config.vTileCount,
	};
}

/**
 * Convert life-related properties (lifeTime, size, rotation, color)
 */
function convertLifeProperties(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
	if (config.startLife !== undefined) {
		const lifeResult = convertValueToMinMax(config.startLife);
		result.minLifeTime = lifeResult.min;
		result.maxLifeTime = lifeResult.max;
		if (lifeResult.gradients) {
			result.lifeTimeGradients = lifeResult.gradients;
		}
	}

	if (config.startSize !== undefined) {
		const sizeResult = convertStartSizeToMinMax(config.startSize);
		result.minSize = sizeResult.min;
		result.maxSize = sizeResult.max;
		if (sizeResult.gradients) {
			result.startSizeGradients = sizeResult.gradients;
		}
	}

	if (config.startRotation !== undefined) {
		const rotResult = convertRotationToMinMax(config.startRotation);
		result.minInitialRotation = rotResult.min;
		result.maxInitialRotation = rotResult.max;
	}

	if (config.startColor !== undefined) {
		const colorResult = convertStartColorToColor4(config.startColor);
		result.color1 = colorResult.color1;
		result.color2 = colorResult.color2;
	}
}

/**
 * Convert emission-related properties (speed, rate, bursts)
 */
function convertEmissionProperties(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
	if (config.startSpeed !== undefined) {
		const speedResult = convertValueToMinMax(config.startSpeed);
		result.minEmitPower = speedResult.min;
		result.maxEmitPower = speedResult.max;
	}

	if (config.emissionOverTime !== undefined) {
		const emitResult = convertValueToMinMax(config.emissionOverTime);
		result.emitRate = emitResult.min;
		if (emitResult.gradients) {
			result.emitRateGradients = emitResult.gradients;
		}
	}

	if (config.emissionOverDistance !== undefined) {
		result.emissionOverDistance = convertValue(config.emissionOverDistance);
	}

	if (config.emissionBursts !== undefined && Array.isArray(config.emissionBursts)) {
		result.emissionBursts = config.emissionBursts.map((burst) => ({
			time: convertValue(burst.time),
			count: convertValue(burst.count),
		}));
	}
}

/**
 * Convert visual properties (sprite animation, shape)
 */
function convertVisualProperties(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
	if (config.startTileIndex !== undefined) {
		result.startTileIndex = convertValue(config.startTileIndex);
	}

	if (config.shape !== undefined) {
		result.shape = convertShape(config.shape);
	}
}

/**
 * Convert behaviors and shape
 */
function convertBehaviorsAndShape(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
	if (config.behaviors !== undefined && Array.isArray(config.behaviors)) {
		result.behaviors = config.behaviors.map((behavior) => convertBehavior(behavior));
	}
}

/**
 * Convert billboard configuration from renderMode
 */
function convertBillboardConfig(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
	const billboardConfig = convertRenderMode(config.renderMode);
	result.isBillboardBased = billboardConfig.isBillboardBased;
	if (billboardConfig.billboardMode !== undefined) {
		result.billboardMode = billboardConfig.billboardMode;
	}
}

/**
 * Helper: Convert renderMode to billboard config
 */
function convertRenderMode(renderMode: number | undefined): { isBillboardBased: boolean; billboardMode?: number } {
	const renderModeMap: Record<number, { isBillboardBased: boolean; billboardMode: number }> = {
		0: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_ALL },
		1: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_STRETCHED },
		2: { isBillboardBased: false, billboardMode: ParticleSystem.BILLBOARDMODE_ALL },
		3: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_ALL },
		4: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_Y },
		5: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_Y },
	};

	if (renderMode !== undefined && renderMode in renderModeMap) {
		return renderModeMap[renderMode];
	}
	return { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_ALL };
}
