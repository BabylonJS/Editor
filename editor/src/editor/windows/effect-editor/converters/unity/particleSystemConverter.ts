import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { IParticleSystemConfig, Behavior } from "babylonjs-editor-tools/src/effect/types";
import { convertColor, convertMinMaxGradient } from "./colorConverter";
import { convertShape } from "./shapeConverter";
import { convertMinMaxCurve } from "./valueConverter";

/**
 * Convert Unity ParticleSystem to our IParticleSystemConfig
 */
export function convertParticleSystem(unityPS: any, _renderer: any): IParticleSystemConfig {
	const main = unityPS.InitialModule;

	const config: IParticleSystemConfig = {
		version: "2.0",
		systemType: "base", // Unity uses GPU particles, similar to our base system

		// Basic properties
		minLifeTime: parseFloat(main.startLifetime?.minScalar || main.startLifetime?.scalar || "5"),
		maxLifeTime: parseFloat(main.startLifetime?.scalar || "5"),
		minSize: parseFloat(main.startSize?.minScalar || main.startSize?.scalar || "1"),
		maxSize: parseFloat(main.startSize?.scalar || "1"),
		minEmitPower: parseFloat(main.startSpeed?.minScalar || main.startSpeed?.scalar || "5"),
		maxEmitPower: parseFloat(main.startSpeed?.scalar || "5"),
		emitRate: parseFloat(unityPS.EmissionModule?.rateOverTime?.scalar || "10"),

		// Duration and looping
		targetStopDuration: main.looping === "1" ? 0 : parseFloat(main.duration?.scalar || "5"),
		preWarmCycles: main.prewarm === "1" ? 100 : 0,
		isLocal: main.simulationSpace === "0", // 0 = Local, 1 = World

		// Color
		color1: convertColor({
			r: main.startColor?.maxColor?.r || "1",
			g: main.startColor?.maxColor?.g || "1",
			b: main.startColor?.maxColor?.b || "1",
			a: main.startColor?.maxColor?.a || "1",
		}),
		color2: convertColor({
			r: main.startColor?.maxColor?.r || "1",
			g: main.startColor?.maxColor?.g || "1",
			b: main.startColor?.maxColor?.b || "1",
			a: main.startColor?.maxColor?.a || "1",
		}),

		// Rotation
		minInitialRotation: parseFloat(main.startRotation?.minScalar || main.startRotation?.scalar || "0"),
		maxInitialRotation: parseFloat(main.startRotation?.scalar || "0"),

		// Gravity (if enabled)
		gravity: main.gravityModifier?.scalar ? new Vector3(0, parseFloat(main.gravityModifier.scalar) * -9.81, 0) : undefined,

		// Shape/Emitter
		shape: convertShape(unityPS.ShapeModule),

		// Behaviors
		behaviors: [],
	};

	// Convert modules to behaviors
	const behaviors: Behavior[] = [];

	// ColorOverLife
	if (unityPS.ColorModule && unityPS.ColorModule.enabled === "1") {
		const colorGradient = convertMinMaxGradient(unityPS.ColorModule.gradient);

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
	if (unityPS.SizeModule && unityPS.SizeModule.enabled === "1") {
		const sizeValue = convertMinMaxCurve(unityPS.SizeModule.curve);
		behaviors.push({
			type: "SizeOverLife",
			size: sizeValue,
		});
	}

	// RotationOverLife
	if (unityPS.RotationOverLifetimeModule && unityPS.RotationOverLifetimeModule.enabled === "1") {
		const rotationZ = convertMinMaxCurve(unityPS.RotationOverLifetimeModule.z || unityPS.RotationOverLifetimeModule.curve);
		behaviors.push({
			type: "RotationOverLife",
			angularVelocity: rotationZ,
		});
	}

	// Rotation3DOverLife (if separate X, Y, Z)
	if (unityPS.RotationOverLifetimeModule && unityPS.RotationOverLifetimeModule.enabled === "1" && unityPS.RotationOverLifetimeModule.separateAxes === "1") {
		behaviors.push({
			type: "Rotation3DOverLife",
			angularVelocityX: convertMinMaxCurve(unityPS.RotationOverLifetimeModule.x),
			angularVelocityY: convertMinMaxCurve(unityPS.RotationOverLifetimeModule.y),
			angularVelocityZ: convertMinMaxCurve(unityPS.RotationOverLifetimeModule.z),
		});
	}

	// VelocityOverLife (SpeedOverLife)
	if (unityPS.VelocityModule && unityPS.VelocityModule.enabled === "1") {
		const speedModifier = unityPS.VelocityModule.speedModifier || { minMaxState: "0", scalar: "1" };
		behaviors.push({
			type: "SpeedOverLife",
			speed: convertMinMaxCurve(speedModifier),
		});
	}

	// LimitVelocityOverLife
	if (unityPS.ClampVelocityModule && unityPS.ClampVelocityModule.enabled === "1") {
		behaviors.push({
			type: "LimitSpeedOverLife",
			limitVelocity: convertMinMaxCurve(unityPS.ClampVelocityModule.magnitude),
			dampen: parseFloat(unityPS.ClampVelocityModule.dampen || "0.1"),
		});
	}

	// ForceOverLife (from Unity's Force module or gravity)
	if (unityPS.ForceModule && unityPS.ForceModule.enabled === "1") {
		behaviors.push({
			type: "ForceOverLife",
			force: {
				x: parseFloat(unityPS.ForceModule.x?.scalar || "0"),
				y: parseFloat(unityPS.ForceModule.y?.scalar || "0"),
				z: parseFloat(unityPS.ForceModule.z?.scalar || "0"),
			},
		});
	}

	// ColorBySpeed
	if (unityPS.ColorBySpeedModule && unityPS.ColorBySpeedModule.enabled === "1") {
		const range = unityPS.ColorBySpeedModule.range;
		const colorGradient = convertMinMaxGradient(unityPS.ColorBySpeedModule.gradient);

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
			minSpeed: { type: "ConstantValue", value: parseFloat(range?.x || "0") },
			maxSpeed: { type: "ConstantValue", value: parseFloat(range?.y || "1") },
		});
	}

	// SizeBySpeed
	if (unityPS.SizeBySpeedModule && unityPS.SizeBySpeedModule.enabled === "1") {
		const range = unityPS.SizeBySpeedModule.range;
		behaviors.push({
			type: "SizeBySpeed",
			size: convertMinMaxCurve(unityPS.SizeBySpeedModule.curve),
			minSpeed: { type: "ConstantValue", value: parseFloat(range?.x || "0") },
			maxSpeed: { type: "ConstantValue", value: parseFloat(range?.y || "1") },
		});
	}

	// RotationBySpeed
	if (unityPS.RotationBySpeedModule && unityPS.RotationBySpeedModule.enabled === "1") {
		const range = unityPS.RotationBySpeedModule.range;
		behaviors.push({
			type: "RotationBySpeed",
			angularVelocity: convertMinMaxCurve(unityPS.RotationBySpeedModule.curve),
			minSpeed: { type: "ConstantValue", value: parseFloat(range?.x || "0") },
			maxSpeed: { type: "ConstantValue", value: parseFloat(range?.y || "1") },
		});
	}

	// NoiseModule (approximation)
	if (unityPS.NoiseModule && unityPS.NoiseModule.enabled === "1") {
		config.noiseStrength = new Vector3(
			parseFloat(unityPS.NoiseModule.strengthX?.scalar || "0"),
			parseFloat(unityPS.NoiseModule.strengthY?.scalar || "0"),
			parseFloat(unityPS.NoiseModule.strengthZ?.scalar || "0")
		);
	}

	config.behaviors = behaviors;

	return config;
}
