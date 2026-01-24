/**
 * Unity Prefab → Babylon.js Effect Converter
 *
 * Converts Unity particle system prefabs directly to our Babylon.js effect format,
 * bypassing the Quarks JSON intermediate step.
 *
 * Based on extracted Unity → Quarks converter logic, but outputs IData format.
 */

import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4, Color3 } from "@babylonjs/core/Maths/math.color";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Tools } from "@babylonjs/core/Misc/tools";
import type {
	IData,
	IEmitter,
	IGroup,
	IParticleSystemConfig,
	Behavior,
	Value,
	IConstantColor,
	IGradientColor,
	IRandomColor,
	IRandomColorBetweenGradient,
	IMaterial,
	ITexture,
	IImage,
	IGeometry,
} from "babylonjs-editor-tools/src/effect/types";
import * as yaml from "js-yaml";

// Note: Babylon.js loaders (FBXFileLoader, OBJFileLoader) are imported in toolbar.tsx
// via "babylonjs-loaders" to register them with SceneLoader globally.
// This allows SceneLoader.ImportMeshAsync to work with FBX/OBJ files.

/**
 * Helper to get component by type from GameObject
 */
function getComponentByType(gameObject: any, componentType: string, components: Map<string, any>): any | null {
	if (!gameObject.m_Component) return null;

	for (const compRef of gameObject.m_Component) {
		const compId = compRef.component?.fileID || compRef.component;
		const comp = components.get(compId);
		if (comp && comp[componentType]) {
			return comp[componentType];
		}
	}

	return null;
}

/**
 * Find root GameObject in hierarchy (Transform with no parent)
 * Based on original Unity converter logic
 */
function findRootGameObject(components: Map<string, any>): string | null {
	console.log(`[findRootGameObject] Searching in ${components.size} components`);

	// Look for Transform component with m_Father.fileID === "0"
	let transformCount = 0;
	let gameObjectCount = 0;

	for (const [_id, comp] of components) {
		if (comp.Transform) transformCount++;
		if (comp.GameObject) gameObjectCount++;

		// Check if this component is a Transform
		if (comp.Transform) {
			// Check if Transform has m_Father with fileID === "0" (no parent = root)
			if (comp.Transform.m_Father !== undefined && comp.Transform.m_Father !== null) {
				const fatherFileID = typeof comp.Transform.m_Father === "object" ? comp.Transform.m_Father.fileID : comp.Transform.m_Father;
				const fatherFileIDStr = String(fatherFileID);

				if (fatherFileIDStr === "0") {
					// Found root Transform, get the GameObject it belongs to
					const gameObjectRef = comp.Transform.m_GameObject;
					if (gameObjectRef) {
						const gameObjectFileID = typeof gameObjectRef === "object" ? gameObjectRef.fileID : gameObjectRef;
						const gameObjectFileIDStr = String(gameObjectFileID);

						// IMPORTANT: Return the component ID (key in Map) that contains this GameObject
						// The gameObjectFileIDStr is the fileID reference, but we need to find the component with that ID
						// Components are stored with their YAML anchor ID as the key (e.g., "195608")
						const gameObjectComponent = components.get(gameObjectFileIDStr);
						if (gameObjectComponent && gameObjectComponent.GameObject) {
							console.log(
								`[findRootGameObject] Found root Transform with m_Father === "0", GameObject fileID: ${gameObjectFileIDStr}, component ID: ${gameObjectFileIDStr}`
							);
							return gameObjectFileIDStr; // This is the component ID/key
						} else {
							console.warn(`[findRootGameObject] GameObject ${gameObjectFileIDStr} not found in components map`);
						}
					}
				}
			} else if (comp.Transform.m_GameObject) {
				// If no m_Father, it might be root (check if it's the only Transform)
				const gameObjectRef = comp.Transform.m_GameObject;
				const gameObjectFileID = typeof gameObjectRef === "object" ? gameObjectRef.fileID : gameObjectRef;
				// Try this as root if we don't find one with m_Father === "0"
				const candidate = String(gameObjectFileID);
				// But first check if there's a Transform with explicit m_Father === "0"
				let hasExplicitRoot = false;
				for (const [_id2, comp2] of components) {
					if (comp2.Transform && comp2.Transform.m_Father !== undefined && comp2.Transform.m_Father !== null) {
						const fatherFileID2 = typeof comp2.Transform.m_Father === "object" ? comp2.Transform.m_Father.fileID : comp2.Transform.m_Father;
						if (String(fatherFileID2) === "0") {
							hasExplicitRoot = true;
							break;
						}
					}
				}
				if (!hasExplicitRoot) {
					console.log(`[findRootGameObject] Using Transform without m_Father as root, GameObject fileID: ${candidate}`);
					return candidate;
				}
			}
		}
	}

	console.log(`[findRootGameObject] No Transform with m_Father === "0" found. Transform count: ${transformCount}, GameObject count: ${gameObjectCount}`);

	// Fallback: find first GameObject if no root Transform found
	for (const [_id, comp] of components) {
		if (comp.GameObject) {
			console.log(`[findRootGameObject] Fallback: Using first GameObject found, component ID: ${_id}`);
			return _id; // Use component ID as GameObject ID
		}
	}

	console.warn(`[findRootGameObject] No GameObject found at all! Component keys:`, Array.from(components.keys()).slice(0, 10));
	console.log(`[findRootGameObject] Sample component structure:`, Array.from(components.entries())[0]);
	return null;
}

/**
 * Unity to Babylon.js coordinate system conversion
 * Unity: Y-up, left-handed → Babylon.js: Y-up, left-handed (same!)
 * But Quarks was Three.js (right-handed), so no conversion needed for us
 */
function convertVector3(unityVec: { x: string; y: string; z: string }): [number, number, number] {
	return [parseFloat(unityVec.x), parseFloat(unityVec.y), parseFloat(unityVec.z)];
}

/**
 * Convert Unity Color to our Color4
 */
function convertColor(unityColor: { r: string; g: string; b: string; a: string }): Color4 {
	return new Color4(parseFloat(unityColor.r), parseFloat(unityColor.g), parseFloat(unityColor.b), parseFloat(unityColor.a));
}

/**
 * Convert Unity AnimationCurve to our PiecewiseBezier Value
 */
function convertAnimationCurve(curve: any, scalar: number = 1): Value {
	const m_Curve = curve.m_Curve;
	if (!m_Curve || m_Curve.length === 0) {
		return { type: "ConstantValue", value: 0 };
	}

	// If only one key, return constant
	if (m_Curve.length === 1) {
		return { type: "ConstantValue", value: parseFloat(m_Curve[0].value) * scalar };
	}

	// Convert to PiecewiseBezier
	const functions: Array<{
		function: {
			p0: number;
			p1: number;
			p2: number;
			p3: number;
		};
		start: number;
	}> = [];

	// Add initial key if curve doesn't start at 0
	if (m_Curve.length >= 1 && parseFloat(m_Curve[0].time) > 0) {
		const val = parseFloat(m_Curve[0].value) * scalar;
		functions.push({
			function: {
				p0: val,
				p1: val,
				p2: val,
				p3: val,
			},
			start: 0,
		});
	}

	// Convert each segment
	for (let i = 0; i < m_Curve.length - 1; i++) {
		const curr = m_Curve[i];
		const next = m_Curve[i + 1];
		const segmentDuration = parseFloat(next.time) - parseFloat(curr.time);

		const p0 = parseFloat(curr.value) * scalar;
		const p1 = (parseFloat(curr.value) + (parseFloat(curr.outSlope) * segmentDuration) / 3) * scalar;
		const p2 = (parseFloat(next.value) - (parseFloat(next.inSlope) * segmentDuration) / 3) * scalar;
		const p3 = parseFloat(next.value) * scalar;

		functions.push({
			function: {
				p0,
				p1,
				p2,
				p3,
			},
			start: parseFloat(curr.time),
		});
	}

	// Add final key if curve doesn't end at 1
	if (m_Curve.length >= 2 && parseFloat(m_Curve[m_Curve.length - 1].time) < 1) {
		const val = parseFloat(m_Curve[m_Curve.length - 1].value) * scalar;
		functions.push({
			function: {
				p0: val,
				p1: val,
				p2: val,
				p3: val,
			},
			start: parseFloat(m_Curve[m_Curve.length - 1].time),
		});
	}

	return {
		type: "PiecewiseBezier",
		functions,
	};
}

/**
 * Convert Unity MinMaxCurve to our Value
 */
function convertMinMaxCurve(minMaxCurve: any): Value {
	const minMaxState = minMaxCurve.minMaxState;
	const scalar = parseFloat(minMaxCurve.scalar || "1");

	switch (minMaxState) {
		case "0": // Constant
			return { type: "ConstantValue", value: scalar };
		case "1": // Curve
			return convertAnimationCurve(minMaxCurve.maxCurve, scalar);
		case "2": // Random between two constants
			return {
				type: "IntervalValue",
				min: parseFloat(minMaxCurve.minScalar || "0") * scalar,
				max: scalar,
			};
		case "3": // Random between two curves
			// For now, just use max curve (proper implementation would need RandomColor equivalent for Value)
			return convertAnimationCurve(minMaxCurve.maxCurve, scalar);
		default:
			return { type: "ConstantValue", value: scalar };
	}
}

/**
 * Convert Unity Gradient to our Color
 */
function convertGradient(gradient: any): IConstantColor | IGradientColor {
	const colorKeys: Array<{ time: number; value: [number, number, number, number] }> = [];

	// Parse color keys
	for (let i = 0; i < gradient.m_NumColorKeys; i++) {
		const key = gradient[`key${i}`];
		const time = parseFloat(gradient[`ctime${i}`]) / 65535; // Unity stores time as 0-65535
		colorKeys.push({
			time,
			value: [parseFloat(key.r), parseFloat(key.g), parseFloat(key.b), 1],
		});
	}

	// Parse alpha keys
	const alphaKeys: Array<{ time: number; value: number }> = [];
	for (let i = 0; i < gradient.m_NumAlphaKeys; i++) {
		const key = gradient[`key${i}`];
		const time = parseFloat(gradient[`atime${i}`]) / 65535;
		alphaKeys.push({
			time,
			value: parseFloat(key.a),
		});
	}

	// If only one color key and one alpha key, return constant color
	if (colorKeys.length === 1 && alphaKeys.length === 1) {
		return {
			type: "ConstantColor",
			value: [...colorKeys[0].value.slice(0, 3), alphaKeys[0].value] as [number, number, number, number],
		};
	}

	// Return gradient
	return {
		type: "Gradient",
		colorKeys: colorKeys.map((k) => ({ time: k.time, value: k.value as [number, number, number, number] })),
		alphaKeys: alphaKeys.map((k) => ({ time: k.time, value: k.value })),
	};
}

/**
 * Convert Unity MinMaxGradient to our Color
 */
function convertMinMaxGradient(minMaxGradient: any): IConstantColor | IGradientColor | IRandomColor | IRandomColorBetweenGradient {
	const minMaxState = minMaxGradient.minMaxState;

	switch (minMaxState) {
		case "0": // Constant color
			return {
				type: "ConstantColor",
				value: [
					parseFloat(minMaxGradient.maxColor.r),
					parseFloat(minMaxGradient.maxColor.g),
					parseFloat(minMaxGradient.maxColor.b),
					parseFloat(minMaxGradient.maxColor.a),
				] as [number, number, number, number],
			};
		case "1": // Gradient
			return convertGradient(minMaxGradient.maxGradient);
		case "2": // Random between two colors
			return {
				type: "RandomColor",
				colorA: [
					parseFloat(minMaxGradient.minColor.r),
					parseFloat(minMaxGradient.minColor.g),
					parseFloat(minMaxGradient.minColor.b),
					parseFloat(minMaxGradient.minColor.a),
				] as [number, number, number, number],
				colorB: [
					parseFloat(minMaxGradient.maxColor.r),
					parseFloat(minMaxGradient.maxColor.g),
					parseFloat(minMaxGradient.maxColor.b),
					parseFloat(minMaxGradient.maxColor.a),
				] as [number, number, number, number],
			};
		case "3": // Random between two gradients
			const grad1 = convertGradient(minMaxGradient.minGradient);
			const grad2 = convertGradient(minMaxGradient.maxGradient);
			if (grad1.type === "Gradient" && grad2.type === "Gradient") {
				return {
					type: "RandomColorBetweenGradient",
					gradient1: {
						colorKeys: grad1.colorKeys,
						alphaKeys: grad1.alphaKeys,
					},
					gradient2: {
						colorKeys: grad2.colorKeys,
						alphaKeys: grad2.alphaKeys,
					},
				};
			}
			// Fallback to constant color if conversion failed
			return { type: "ConstantColor", value: [1, 1, 1, 1] };
		default:
			return { type: "ConstantColor", value: [1, 1, 1, 1] };
	}
}

/**
 * Convert Unity ParticleSystem shape to our emitter shape
 */
function convertShape(shapeModule: any): any {
	if (!shapeModule || shapeModule.enabled !== "1") {
		return { type: "point" }; // Default to point emitter
	}

	const shapeType = shapeModule.type;

	switch (shapeType) {
		case "0": // Sphere
			return {
				type: "sphere",
				radius: parseFloat(shapeModule.radius?.value || "1"),
				arc: (parseFloat(shapeModule.arc?.value || "360") / 180) * Math.PI,
				thickness: parseFloat(shapeModule.radiusThickness || "1"),
			};
		case "4": // Cone
			return {
				type: "cone",
				radius: parseFloat(shapeModule.radius?.value || "1"),
				arc: (parseFloat(shapeModule.arc?.value || "360") / 180) * Math.PI,
				thickness: parseFloat(shapeModule.radiusThickness || "1"),
				angle: (parseFloat(shapeModule.angle?.value || "25") / 180) * Math.PI,
			};
		case "5": // Box
			return {
				type: "box",
				width: parseFloat(shapeModule.boxThickness?.x || "1"),
				height: parseFloat(shapeModule.boxThickness?.y || "1"),
				depth: parseFloat(shapeModule.boxThickness?.z || "1"),
			};
		case "10": // Circle
			return {
				type: "sphere", // Use sphere with arc for circle
				radius: parseFloat(shapeModule.radius?.value || "1"),
				arc: (parseFloat(shapeModule.arc?.value || "360") / 180) * Math.PI,
			};
		default:
			return { type: "point" };
	}
}

/**
 * Convert Unity ParticleSystem to our IParticleSystemConfig
 */
function convertParticleSystem(unityPS: any, _renderer: any): IParticleSystemConfig {
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

/**
 * Intermediate format for convertGameObject (before conversion to IData format)
 */
interface IIntermediateGameObject {
	type: "emitter" | "group";
	name: string;
	position: [number, number, number];
	scale: [number, number, number];
	rotation: [number, number, number, number];
	emitter?: IParticleSystemConfig;
	renderMode?: number;
	materialId?: string; // GUID of material from ParticleSystemRenderer
	children?: IIntermediateGameObject[];
}

/**
 * Convert Unity GameObject hierarchy to our IGroup/IEmitter structure
 */
function convertGameObject(gameObject: any, components: Map<string, any>): IIntermediateGameObject {
	// Get Transform component
	const transform = getComponentByType(gameObject, "Transform", components);

	const position = transform ? convertVector3(transform.m_LocalPosition) : ([0, 0, 0] as [number, number, number]);
	const scale = transform ? convertVector3(transform.m_LocalScale) : ([1, 1, 1] as [number, number, number]);
	const rotation = transform
		? ([parseFloat(transform.m_LocalRotation.x), parseFloat(transform.m_LocalRotation.y), parseFloat(transform.m_LocalRotation.z), parseFloat(transform.m_LocalRotation.w)] as [
				number,
				number,
				number,
				number,
			])
		: ([0, 0, 0, 1] as [number, number, number, number]);

	// Check if this GameObject has a ParticleSystem component
	const ps = getComponentByType(gameObject, "ParticleSystem", components);

	if (ps) {
		// It's a particle emitter
		const renderer = getComponentByType(gameObject, "ParticleSystemRenderer", components);
		const emitterConfig = convertParticleSystem(ps, renderer);

		// Determine render mode from renderer
		let renderMode = 0; // Default: BillBoard
		let materialId: string | undefined;
		if (renderer) {
			const m_RenderMode = parseInt(renderer.m_RenderMode || "0");
			switch (m_RenderMode) {
				case 0:
					renderMode = 0; // BillBoard
					break;
				case 1:
					renderMode = 1; // StretchedBillBoard
					break;
				case 2:
					renderMode = 2; // HorizontalBillBoard
					break;
				case 3:
					renderMode = 3; // VerticalBillBoard
					break;
				case 4:
					renderMode = 4; // Mesh
					break;
			}

			// Extract material GUID from renderer
			if (renderer.m_Materials && Array.isArray(renderer.m_Materials) && renderer.m_Materials.length > 0) {
				const materialRef = renderer.m_Materials[0];
				if (materialRef && materialRef.guid) {
					materialId = materialRef.guid;
				}
			}
		}

		const emitter: IIntermediateGameObject = {
			type: "emitter",
			name: gameObject.m_Name || "ParticleSystem",
			position,
			scale,
			rotation,
			emitter: emitterConfig,
			renderMode,
			materialId,
		};

		return emitter;
	} else {
		// It's a group (container)
		const group: IIntermediateGameObject = {
			type: "group",
			name: gameObject.m_Name || "Group",
			position,
			scale,
			rotation,
			children: [],
		};

		// Recursively convert children
		if (transform && transform.m_Children) {
			for (const childRef of transform.m_Children) {
				const childTransform = components.get(childRef.fileID);
				if (childTransform && childTransform.Transform) {
					const childGORef = childTransform.Transform.m_GameObject;
					const childGOId = childGORef?.fileID || childGORef;
					const childGO = components.get(childGOId);

					if (childGO && childGO.GameObject) {
						if (!group.children) {
							group.children = [];
						}
						group.children.push(convertGameObject(childGO.GameObject, components));
					}
				}
			}
		}

		return group;
	}
}

/**
 * Convert convertGameObject result to IGroup or IEmitter format
 * Recursively processes children
 */
function _convertToIDataFormat(converted: IIntermediateGameObject): IGroup | IEmitter | null {
	if (!converted) {
		return null;
	}

	const uuid = Tools.RandomId();

	if (converted.type === "group") {
		// Convert children recursively
		const children: (IGroup | IEmitter)[] = [];
		if (converted.children && Array.isArray(converted.children)) {
			for (const child of converted.children) {
				const childConverted = _convertToIDataFormat(child);
				if (childConverted) {
					children.push(childConverted);
				}
			}
		}

		const group: IGroup = {
			uuid,
			name: converted.name,
			transform: {
				position: new Vector3(converted.position[0], converted.position[1], converted.position[2]),
				rotation: new Vector3(converted.rotation[0], converted.rotation[1], converted.rotation[2]),
				scale: new Vector3(converted.scale[0], converted.scale[1], converted.scale[2]),
			},
			children: children,
		};
		return group;
	} else {
		if (!converted.emitter) {
			console.warn("Emitter config is missing for", converted.name);
			return null;
		}
		const emitter: IEmitter = {
			uuid,
			name: converted.name,
			transform: {
				position: new Vector3(converted.position[0], converted.position[1], converted.position[2]),
				rotation: new Vector3(converted.rotation[0], converted.rotation[1], converted.rotation[2]),
				scale: new Vector3(converted.scale[0], converted.scale[1], converted.scale[2]),
			},
			config: converted.emitter,
			systemType: converted.renderMode === 4 ? "solid" : "base", // Mesh = solid, others = base
			materialId: converted.materialId, // Link material to emitter
		};
		return emitter;
	}
}

/**
 * Convert Unity model buffer to IGeometry using Babylon.js loaders
 */
async function convertUnityModel(guid: string, buffer: Buffer, extension: string, scene: Scene): Promise<IGeometry | null> {
	try {
		// Determine MIME type based on extension
		let mimeType = "application/octet-stream";
		if (extension === "obj") {
			mimeType = "text/plain";
		} else if (extension === "fbx") {
			mimeType = "application/octet-stream";
		}

		// Create data URL from buffer
		const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

		// Import mesh using Babylon.js SceneLoader
		const result = await SceneLoader.ImportMeshAsync("", dataUrl, "", scene);

		if (!result || !result.meshes || result.meshes.length === 0) {
			return null;
		}

		// Find the first mesh
		const mesh = result.meshes.find((m) => m instanceof Mesh) as Mesh | undefined;
		if (!mesh || !mesh.geometry) {
			return null;
		}

		// Extract vertex data
		const vertexData = VertexData.ExtractFromMesh(mesh);
		if (!vertexData) {
			return null;
		}

		// Convert to IGeometry format
		const geometry: IGeometry = {
			uuid: guid,
			type: "BufferGeometry",
			data: {
				attributes: {},
			},
		};

		// Convert positions
		if (vertexData.positions) {
			geometry.data!.attributes.position = {
				array: Array.from(vertexData.positions),
				itemSize: 3,
			};
		}

		// Convert normals
		if (vertexData.normals) {
			geometry.data!.attributes.normal = {
				array: Array.from(vertexData.normals),
				itemSize: 3,
			};
		}

		// Convert UVs
		if (vertexData.uvs) {
			geometry.data!.attributes.uv = {
				array: Array.from(vertexData.uvs),
				itemSize: 2,
			};
		}

		// Convert indices
		if (vertexData.indices) {
			geometry.data!.index = {
				array: Array.from(vertexData.indices),
			};
		}

		// Cleanup: dispose imported meshes
		for (const m of result.meshes) {
			m.dispose();
		}

		return geometry;
	} catch (error) {
		console.warn(`Failed to convert Unity model ${guid}:`, error);
		return null;
	}
}

/**
 * Convert Unity prefab components to IData
 *
 * @param components - Already parsed Unity components Map (parsed in modal)
 * @param dependencies - Optional dependencies (textures, materials, models, sounds)
 * @param scene - Babylon.js Scene for loading models (required for model parsing)
 * @returns IData structure ready for our Effect system
 */
export async function convertUnityPrefabToData(
	components: Map<string, any>,
	dependencies?: {
		textures?: Map<string, Buffer>;
		materials?: Map<string, string>;
		models?: Map<string, Buffer>;
		sounds?: Map<string, Buffer>;
		meta?: Map<string, any>;
	},
	scene?: Scene
): Promise<IData> {
	// Validate components is a Map
	if (!(components instanceof Map)) {
		console.error("convertUnityPrefabToData: components must be a Map, got:", typeof components, components);
		throw new Error("components must be a Map<string, any>");
	}

	let root: IGroup | IEmitter | null = null;

	// Find root GameObject
	const rootGameObjectId = findRootGameObject(components);
	if (!rootGameObjectId) {
		console.warn("No root GameObject found in Unity prefab");
		return {
			root: null,
			materials: [],
			textures: [],
			images: [],
			geometries: [],
		};
	}

	const rootComponent = components.get(rootGameObjectId);
	if (!rootComponent) {
		console.warn(`[convertUnityPrefabToData] Root GameObject component ${rootGameObjectId} not found in components map`);
		console.log("[convertUnityPrefabToData] Available component IDs (first 20):", Array.from(components.keys()).slice(0, 20));
		console.log("[convertUnityPrefabToData] Component structure samples:");
		for (const [id, comp] of Array.from(components.entries()).slice(0, 5)) {
			console.log(`  Component ${id}:`, {
				keys: Object.keys(comp),
				hasTransform: !!comp.Transform,
				hasGameObject: !!comp.GameObject,
				__type: comp.__type,
			});
		}
		return {
			root: null,
			materials: [],
			textures: [],
			images: [],
			geometries: [],
		};
	}

	console.log(`[convertUnityPrefabToData] Found root component ${rootGameObjectId}:`, {
		keys: Object.keys(rootComponent),
		hasGameObject: !!rootComponent.GameObject,
		hasTransform: !!rootComponent.Transform,
		__type: rootComponent.__type,
	});

	// Get GameObject from component (could be rootComponent.GameObject or rootComponent itself)
	const gameObject = rootComponent.GameObject || rootComponent;
	if (!gameObject || (typeof gameObject === "object" && !gameObject.m_Name && !gameObject.m_Component)) {
		console.warn(`[convertUnityPrefabToData] Root GameObject ${rootGameObjectId} structure invalid:`, rootComponent);
		console.log("[convertUnityPrefabToData] Available keys in rootComponent:", Object.keys(rootComponent));
		console.log("[convertUnityPrefabToData] gameObject:", gameObject);

		// Try to find GameObject component directly
		for (const [_id, comp] of components) {
			if (comp.GameObject && comp.GameObject.m_Name) {
				console.log(`[convertUnityPrefabToData] Found GameObject component ${_id} with name:`, comp.GameObject.m_Name);
				const foundGameObject = comp.GameObject;
				if (foundGameObject.m_Component) {
					console.log(`[convertUnityPrefabToData] Using GameObject from component ${_id}`);
					const converted = convertGameObject(foundGameObject, components);
					root = _convertToIDataFormat(converted);
					break;
				}
			}
		}

		if (!root) {
			return {
				root: null,
				materials: [],
				textures: [],
				images: [],
				geometries: [],
			};
		}
	} else {
		// Convert root GameObject and its hierarchy recursively
		console.log(`[convertUnityPrefabToData] Converting GameObject:`, gameObject.m_Name);
		const converted = convertGameObject(gameObject, components);
		root = _convertToIDataFormat(converted);
	}

	// Process dependencies if provided
	const materials: IMaterial[] = [];
	const textures: ITexture[] = [];
	const images: IImage[] = [];
	const geometries: IGeometry[] = [];

	if (dependencies) {
		// Convert materials from YAML to IData format
		if (dependencies.materials) {
			for (const [guid, yamlContent] of dependencies.materials) {
				try {
					const material = convertUnityMaterial(guid, yamlContent, dependencies);
					if (material) {
						materials.push(material);
					}
				} catch (error) {
					console.warn(`Failed to convert material ${guid}:`, error);
				}
			}
		}

		// Convert textures to IData format
		if (dependencies.textures) {
			for (const [guid, buffer] of dependencies.textures) {
				// Create image entry for texture
				const imageId = `image-${guid}`;
				images.push({
					uuid: imageId,
					url: `data:image/png;base64,${buffer.toString("base64")}`, // Convert buffer to data URL
				});

				// Create texture entry
				textures.push({
					uuid: guid,
					image: imageId,
					wrapU: 0, // Repeat
					wrapV: 0, // Repeat
					generateMipmaps: true,
					flipY: false,
				});
			}
		}

		// Convert models to IData format (for mesh particles)
		// Parse models using Babylon.js loaders if Scene is provided
		if (dependencies.models && scene) {
			for (const [guid, buffer] of dependencies.models) {
				// Determine file extension from meta
				const meta = dependencies.meta?.get(guid);
				const path = meta?.path || "";
				const ext = path.split(".").pop()?.toLowerCase() || "fbx";

				try {
					const geometry = await convertUnityModel(guid, buffer, ext, scene);
					if (geometry) {
						geometries.push(geometry);
					} else {
						// Fallback: store placeholder if parsing failed
						geometries.push({
							uuid: guid,
							type: "BufferGeometry",
						});
					}
				} catch (error) {
					console.warn(`Failed to parse model ${guid}:`, error);
					// Fallback: store placeholder
					geometries.push({
						uuid: guid,
						type: "BufferGeometry",
					});
				}
			}
		} else if (dependencies.models) {
			// If no Scene provided, store placeholders (models will be loaded later)
			for (const [guid] of dependencies.models) {
				geometries.push({
					uuid: guid,
					type: "BufferGeometry",
				});
			}
		}
	}

	return {
		root,
		materials,
		textures,
		images,
		geometries,
	};
}

/**
 * Convert Unity Material YAML to IMaterial
 */
function convertUnityMaterial(guid: string, yamlContent: string, dependencies: any): IMaterial | null {
	try {
		// Parse Unity material YAML
		const parsed = yaml.load(yamlContent) as any;
		if (!parsed || !parsed.Material) {
			return null;
		}

		const unityMat = parsed.Material;
		const material: IMaterial = {
			uuid: guid,
		};

		// Extract color
		if (unityMat.m_SavedProperties?.m_Colors) {
			const colorProps = unityMat.m_SavedProperties.m_Colors;
			for (const colorProp of colorProps) {
				if (colorProp._Color) {
					const r = parseFloat(colorProp._Color.r || "1");
					const g = parseFloat(colorProp._Color.g || "1");
					const b = parseFloat(colorProp._Color.b || "1");
					material.color = new Color3(r, g, b);
					break;
				}
			}
		}

		// Extract texture (MainTex)
		if (unityMat.m_SavedProperties?.m_TexEnvs) {
			for (const texEnv of unityMat.m_SavedProperties.m_TexEnvs) {
				if (texEnv._MainTex && texEnv._MainTex.m_Texture) {
					const texRef = texEnv._MainTex.m_Texture;
					const textureGuid = texRef.guid || texRef.fileID;
					if (textureGuid && dependencies.textures?.has(textureGuid)) {
						material.map = textureGuid; // Reference to texture UUID
					}
					break;
				}
			}
		}

		// Extract transparency
		if (unityMat.stringTagMap?.RenderType === "Transparent") {
			material.transparent = true;
		}

		// Extract opacity
		if (unityMat.m_SavedProperties?.m_Colors) {
			for (const colorProp of unityMat.m_SavedProperties.m_Colors) {
				if (colorProp._Color && colorProp._Color.a !== undefined) {
					material.opacity = parseFloat(colorProp._Color.a || "1");
					break;
				}
			}
		}

		// Extract blending mode from shader
		const shaderFileID = unityMat.m_Shader?.fileID;
		if (shaderFileID) {
			// Unity shader IDs: 200 = Standard, 203 = Unlit, etc.
			// For now, use default blending
			material.blending = 0; // Normal blending
		}

		return material;
	} catch (error) {
		console.warn(`Failed to parse Unity material ${guid}:`, error);
		return null;
	}
}

/**
 * Convert Unity prefab ZIP to IData
 *
 * @param zipBuffer - Unity prefab ZIP file buffer
 * @returns Array of IData structures
 */
