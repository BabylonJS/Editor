import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { IParticleSystemConfig, Behavior } from "babylonjs-editor-tools/src/effect/types";
import { getUnityProp } from "./utils";
import { convertColor, convertMinMaxGradient } from "./colorConverter";
import { convertShape } from "./shapeConverter";
import { convertMinMaxCurve } from "./valueConverter";

/** Default config when main module is missing */
function defaultParticleConfig(): IParticleSystemConfig {
	return {
		version: "2.0",
		systemType: "base",
		minLifeTime: 5,
		maxLifeTime: 5,
		minSize: 1,
		maxSize: 1,
		minEmitPower: 5,
		maxEmitPower: 5,
		emitRate: 10,
		targetStopDuration: 5,
		preWarmCycles: 0,
		isLocal: true,
		shape: { type: "point" },
		behaviors: [],
	};
}

/**
 * Map Unity ParticleSystemRenderer.m_RenderMode to isBillboardBased + billboardMode (same as Quarks).
 */
function billboardFromRenderMode(renderMode: number | undefined): { isBillboardBased: boolean; billboardMode: number } {
	const map: Record<number, { isBillboardBased: boolean; billboardMode: number }> = {
		0: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_ALL },
		1: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_STRETCHED },
		2: { isBillboardBased: false, billboardMode: ParticleSystem.BILLBOARDMODE_ALL },
		3: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_ALL },
		4: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_Y },
		5: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_Y },
	};
	return renderMode !== undefined && renderMode in map
		? map[renderMode]
		: { isBillboardBased: true, billboardMode: ParticleSystem.BILLBOARDMODE_ALL };
}

/**
 * Convert Unity ParticleSystem to our IParticleSystemConfig
 */
export function convertParticleSystem(unityPS: any, renderer: any): IParticleSystemConfig {
	const main = getUnityProp(unityPS, "InitialModule");
	if (!main) {
		const config = defaultParticleConfig();
		if (renderer != null) {
			const mode = parseInt(renderer.m_RenderMode ?? renderer.renderMode ?? "0", 10);
			const billboard = billboardFromRenderMode(mode);
			config.isBillboardBased = billboard.isBillboardBased;
			config.billboardMode = billboard.billboardMode;
		}
		return config;
	}

	const emissionModule = getUnityProp(unityPS, "EmissionModule");
	const shapeModule = getUnityProp(unityPS, "ShapeModule");

	const startLifetime = getUnityProp(main, "startLifetime");
	const startSize = getUnityProp(main, "startSize");
	const startSpeed = getUnityProp(main, "startSpeed");
	const startRotation = getUnityProp(main, "startRotation");
	const startColor = getUnityProp(main, "startColor");
	const maxColor = startColor?.maxColor ?? startColor?.m_MaxColor;

	const config: IParticleSystemConfig = {
		version: "2.0",
		systemType: "base",

		minLifeTime: parseFloat(startLifetime?.minScalar ?? startLifetime?.scalar ?? "5"),
		maxLifeTime: parseFloat(startLifetime?.scalar ?? "5"),
		minSize: parseFloat(startSize?.minScalar ?? startSize?.scalar ?? "1"),
		maxSize: parseFloat(startSize?.scalar ?? "1"),
		minEmitPower: parseFloat(startSpeed?.minScalar ?? startSpeed?.scalar ?? "5"),
		maxEmitPower: parseFloat(startSpeed?.scalar ?? "5"),
		emitRate: parseFloat(getUnityProp(emissionModule, "rateOverTime")?.scalar ?? "10"),

		targetStopDuration: main.looping === "1" ? 0 : parseFloat(getUnityProp(main, "duration")?.scalar ?? "5"),
		preWarmCycles: main.prewarm === "1" ? 100 : 0,
		isLocal: (getUnityProp(main, "simulationSpace") ?? main.simulationSpace) === "0",

		color1: convertColor(
			maxColor
				? { r: maxColor.r ?? "1", g: maxColor.g ?? "1", b: maxColor.b ?? "1", a: maxColor.a ?? "1" }
				: { r: "1", g: "1", b: "1", a: "1" }
		),
		color2: convertColor(
			maxColor
				? { r: maxColor.r ?? "1", g: maxColor.g ?? "1", b: maxColor.b ?? "1", a: maxColor.a ?? "1" }
				: { r: "1", g: "1", b: "1", a: "1" }
		),

		minInitialRotation: parseFloat(startRotation?.minScalar ?? startRotation?.scalar ?? "0"),
		maxInitialRotation: parseFloat(startRotation?.scalar ?? "0"),

		gravity: (() => {
			const gm = getUnityProp(main, "gravityModifier");
			const s = gm?.scalar;
			return s != null && s !== "" ? new Vector3(0, parseFloat(String(s)) * -9.81, 0) : undefined;
		})(),

		shape: convertShape(shapeModule ?? unityPS.ShapeModule),
		behaviors: [],
	};

	// Emission bursts
	const bursts = getUnityProp(emissionModule, "m_Bursts") ?? emissionModule?.m_Bursts;
	if (Array.isArray(bursts) && bursts.length > 0) {
		config.emissionBursts = bursts.map((b: any) => ({
			time: { type: "ConstantValue" as const, value: parseFloat(b.time ?? b.m_Time ?? 0) },
			count: { type: "ConstantValue" as const, value: parseFloat(b.count ?? b.m_Count ?? 1) },
		}));
	}

	// Billboard from renderer
	if (renderer != null) {
		const mode = parseInt(renderer.m_RenderMode ?? renderer.renderMode ?? "0", 10);
		const billboard = billboardFromRenderMode(mode);
		config.isBillboardBased = billboard.isBillboardBased;
		config.billboardMode = billboard.billboardMode;
	}

	// Convert modules to behaviors (support both Module and m_Module names)
	const behaviors: Behavior[] = [];
	const colorModule = getUnityProp(unityPS, "ColorModule");
	const sizeModule = getUnityProp(unityPS, "SizeModule");
	const rotationOverLifetimeModule = getUnityProp(unityPS, "RotationOverLifetimeModule");
	const velocityModule = getUnityProp(unityPS, "VelocityModule");
	const clampVelocityModule = getUnityProp(unityPS, "ClampVelocityModule");
	const forceModule = getUnityProp(unityPS, "ForceModule");
	const colorBySpeedModule = getUnityProp(unityPS, "ColorBySpeedModule");
	const sizeBySpeedModule = getUnityProp(unityPS, "SizeBySpeedModule");
	const rotationBySpeedModule = getUnityProp(unityPS, "RotationBySpeedModule");
	const noiseModule = getUnityProp(unityPS, "NoiseModule");

	const isEnabled = (m: any) => (getUnityProp(m, "enabled") ?? m?.enabled) === "1";

	// ColorOverLife
	if (colorModule && isEnabled(colorModule)) {
		const colorGradient = convertMinMaxGradient(getUnityProp(colorModule, "gradient") ?? colorModule.gradient);

		// Convert Color type to IColorFunction
		let colorFunction: { colorFunctionType: string; data: any };
		if (colorGradient.type === "ConstantColor") {
			colorFunction = {
				colorFunctionType: "ConstantColor",
				data: {
					color: {
						r: colorGradient.value[0],
						g: colorGradient.value[1],
						b: colorGradient.value[2],
						a: colorGradient.value[3],
					},
				},
			};
		} else if (colorGradient.type === "Gradient") {
			colorFunction = {
				colorFunctionType: "Gradient",
				data: {
					colorKeys: colorGradient.colorKeys,
					alphaKeys: colorGradient.alphaKeys || [],
				},
			};
		} else if (colorGradient.type === "RandomColor") {
			colorFunction = {
				colorFunctionType: "ColorRange",
				data: {
					colorA: colorGradient.colorA,
					colorB: colorGradient.colorB,
				},
			};
		} else if (colorGradient.type === "RandomColorBetweenGradient") {
			colorFunction = {
				colorFunctionType: "RandomColorBetweenGradient",
				data: {
					gradient1: {
						colorKeys: colorGradient.gradient1.colorKeys,
						alphaKeys: colorGradient.gradient1.alphaKeys || [],
					},
					gradient2: {
						colorKeys: colorGradient.gradient2.colorKeys,
						alphaKeys: colorGradient.gradient2.alphaKeys || [],
					},
				},
			};
		} else {
			colorFunction = {
				colorFunctionType: "ConstantColor",
				data: { color: { r: 1, g: 1, b: 1, a: 1 } },
			};
		}

		behaviors.push({
			type: "ColorOverLife",
			color: colorFunction,
		});
	}

	// SizeOverLife
	if (sizeModule && isEnabled(sizeModule)) {
		const curve = getUnityProp(sizeModule, "curve") ?? sizeModule.curve;
		behaviors.push({
			type: "SizeOverLife",
			size: convertMinMaxCurve(curve),
		});
	}

	// RotationOverLife
	if (rotationOverLifetimeModule && isEnabled(rotationOverLifetimeModule)) {
		const z = getUnityProp(rotationOverLifetimeModule, "z") ?? rotationOverLifetimeModule.curve;
		behaviors.push({
			type: "RotationOverLife",
			angularVelocity: convertMinMaxCurve(z ?? rotationOverLifetimeModule.curve),
		});
	}

	// Rotation3DOverLife (if separate X, Y, Z)
	if (rotationOverLifetimeModule && isEnabled(rotationOverLifetimeModule) && (rotationOverLifetimeModule.separateAxes === "1" || getUnityProp(rotationOverLifetimeModule, "separateAxes") === "1")) {
		behaviors.push({
			type: "Rotation3DOverLife",
			angularVelocityX: convertMinMaxCurve(getUnityProp(rotationOverLifetimeModule, "x") ?? {}),
			angularVelocityY: convertMinMaxCurve(getUnityProp(rotationOverLifetimeModule, "y") ?? {}),
			angularVelocityZ: convertMinMaxCurve(getUnityProp(rotationOverLifetimeModule, "z") ?? {}),
		});
	}

	// VelocityOverLife (SpeedOverLife)
	if (velocityModule && isEnabled(velocityModule)) {
		const speedModifier = getUnityProp(velocityModule, "speedModifier") ?? velocityModule.speedModifier ?? { minMaxState: "0", scalar: "1" };
		behaviors.push({
			type: "SpeedOverLife",
			speed: convertMinMaxCurve(speedModifier),
		});
	}

	// LimitVelocityOverLife
	if (clampVelocityModule && isEnabled(clampVelocityModule)) {
		const magnitude = getUnityProp(clampVelocityModule, "magnitude") ?? clampVelocityModule.magnitude;
		behaviors.push({
			type: "LimitSpeedOverLife",
			limitVelocity: convertMinMaxCurve(magnitude ?? {}),
			dampen: parseFloat(clampVelocityModule.dampen ?? "0.1"),
		});
	}

	// ForceOverLife
	if (forceModule && isEnabled(forceModule)) {
		const x = getUnityProp(forceModule, "x");
		const y = getUnityProp(forceModule, "y");
		const z = getUnityProp(forceModule, "z");
		behaviors.push({
			type: "ForceOverLife",
			force: {
				x: parseFloat(x?.scalar ?? "0"),
				y: parseFloat(y?.scalar ?? "0"),
				z: parseFloat(z?.scalar ?? "0"),
			},
		});
	}

	// ColorBySpeed
	if (colorBySpeedModule && isEnabled(colorBySpeedModule)) {
		const range = getUnityProp(colorBySpeedModule, "range") ?? colorBySpeedModule.range;
		const colorGradient = convertMinMaxGradient(getUnityProp(colorBySpeedModule, "gradient") ?? colorBySpeedModule.gradient);

		let colorFunction: { colorFunctionType: string; data: any };
		if (colorGradient.type === "Gradient") {
			colorFunction = {
				colorFunctionType: "Gradient",
				data: {
					colorKeys: colorGradient.colorKeys,
					alphaKeys: colorGradient.alphaKeys || [],
				},
			};
		} else {
			colorFunction = {
				colorFunctionType: "ConstantColor",
				data: { color: { r: 1, g: 1, b: 1, a: 1 } },
			};
		}

		behaviors.push({
			type: "ColorBySpeed",
			color: colorFunction,
			minSpeed: { type: "ConstantValue", value: parseFloat(range?.x ?? range?.m_X ?? "0") },
			maxSpeed: { type: "ConstantValue", value: parseFloat(range?.y ?? range?.m_Y ?? "1") },
		});
	}

	// SizeBySpeed
	if (sizeBySpeedModule && isEnabled(sizeBySpeedModule)) {
		const range = getUnityProp(sizeBySpeedModule, "range") ?? sizeBySpeedModule.range;
		const curve = getUnityProp(sizeBySpeedModule, "curve") ?? sizeBySpeedModule.curve;
		behaviors.push({
			type: "SizeBySpeed",
			size: convertMinMaxCurve(curve),
			minSpeed: { type: "ConstantValue", value: parseFloat(range?.x ?? range?.m_X ?? "0") },
			maxSpeed: { type: "ConstantValue", value: parseFloat(range?.y ?? range?.m_Y ?? "1") },
		});
	}

	// RotationBySpeed
	if (rotationBySpeedModule && isEnabled(rotationBySpeedModule)) {
		const range = getUnityProp(rotationBySpeedModule, "range") ?? rotationBySpeedModule.range;
		const curve = getUnityProp(rotationBySpeedModule, "curve") ?? rotationBySpeedModule.curve;
		behaviors.push({
			type: "RotationBySpeed",
			angularVelocity: convertMinMaxCurve(curve),
			minSpeed: { type: "ConstantValue", value: parseFloat(range?.x ?? range?.m_X ?? "0") },
			maxSpeed: { type: "ConstantValue", value: parseFloat(range?.y ?? range?.m_Y ?? "1") },
		});
	}

	// NoiseModule (approximation)
	if (noiseModule && isEnabled(noiseModule)) {
		const sx = getUnityProp(noiseModule, "strengthX") ?? noiseModule.strengthX;
		const sy = getUnityProp(noiseModule, "strengthY") ?? noiseModule.strengthY;
		const sz = getUnityProp(noiseModule, "strengthZ") ?? noiseModule.strengthZ;
		config.noiseStrength = new Vector3(
			parseFloat(sx?.scalar ?? "0"),
			parseFloat(sy?.scalar ?? "0"),
			parseFloat(sz?.scalar ?? "0")
		);
	}

	config.behaviors = behaviors;

	return config;
}
