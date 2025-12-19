import { Vector3, Matrix, Quaternion, Color3, Texture as BabylonTexture, ParticleSystem, Color4 } from "babylonjs";
import type { ILoaderOptions } from "../types/loader";
import type {
	IQuarksJSON,
	IQuarksMaterial,
	IQuarksTexture,
	IQuarksImage,
	IQuarksGeometry,
	IQuarksObject,
	IQuarksParticleEmitterConfig,
	IQuarksBehavior,
	IQuarksValue,
	IQuarksColor,
	IQuarksRotation,
	IQuarksGradientKey,
	IQuarksShape,
	IQuarksColorOverLifeBehavior,
	IQuarksSizeOverLifeBehavior,
	IQuarksRotationOverLifeBehavior,
	IQuarksForceOverLifeBehavior,
	IQuarksGravityForceBehavior,
	IQuarksSpeedOverLifeBehavior,
	IQuarksFrameOverLifeBehavior,
	IQuarksLimitSpeedOverLifeBehavior,
	IQuarksColorBySpeedBehavior,
	IQuarksSizeBySpeedBehavior,
	IQuarksRotationBySpeedBehavior,
	IQuarksOrbitOverLifeBehavior,
} from "../types/quarksTypes";
import type { ITransform, IGroup, IEmitter, IData } from "../types/hierarchy";
import type { IMaterial, ITexture, IImage, IGeometry, IGeometryData } from "../types/resources";
import type { IParticleSystemConfig } from "../types/emitter";
import type {
	Behavior,
	IColorOverLifeBehavior,
	ISizeOverLifeBehavior,
	IForceOverLifeBehavior,
	ISpeedOverLifeBehavior,
	ILimitSpeedOverLifeBehavior,
	IColorBySpeedBehavior,
	ISizeBySpeedBehavior,
} from "../types/behaviors";
import type { Value } from "../types/values";
import type { IGradientKey } from "../types/gradients";
import type { IShape } from "../types/shapes";
import { Logger } from "../loggers/logger";

/**
 * Converts IQuarks/Three.js  JSON (right-handed) to Babylon.js  format (left-handed)
 * All coordinate system conversions happen here, once
 */
export class DataConverter {
	private _logger: Logger;

	constructor(options?: ILoaderOptions) {
		this._logger = new Logger("[DataConverter]", options);
	}

	/**
	 * Convert IQuarks/Three.js  JSON to Babylon.js  format
	 * Handles errors gracefully and returns partial data if conversion fails
	 */
	public convert(IQuarksData: IQuarksJSON): IData {
		this._logger.log("=== Converting IQuarks  to Babylon.js  format ===");

		const groups = new Map<string, IGroup>();
		const emitters = new Map<string, IEmitter>();

		let root: IGroup | IEmitter | null = null;

		try {
			if (IQuarksData.object) {
				root = this._convertObject(IQuarksData.object, null, groups, emitters, 0);
			}
		} catch (error) {
			this._logger.error(`Failed to convert root object: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Convert all resources with error handling
		let materials: IMaterial[] = [];
		let textures: ITexture[] = [];
		let images: IImage[] = [];
		let geometries: IGeometry[] = [];

		try {
			materials = this._convertMaterials(IQuarksData.materials || []);
		} catch (error) {
			this._logger.error(`Failed to convert materials: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			textures = this._convertTextures(IQuarksData.textures || []);
		} catch (error) {
			this._logger.error(`Failed to convert textures: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			images = this._convertImages(IQuarksData.images || []);
		} catch (error) {
			this._logger.error(`Failed to convert images: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			geometries = this._convertGeometries(IQuarksData.geometries || []);
		} catch (error) {
			this._logger.error(`Failed to convert geometries: ${error instanceof Error ? error.message : String(error)}`);
		}

		this._logger.log(
			`=== Conversion complete. Groups: ${groups.size}, Emitters: ${emitters.size}, Materials: ${materials.length}, Textures: ${textures.length}, Images: ${images.length}, Geometries: ${geometries.length} ===`
		);

		return {
			root,
			groups,
			emitters,
			materials,
			textures,
			images,
			geometries,
		};
	}

	/**
	 * Convert a IQuarks/Three.js object to Babylon.js  format
	 */
	private _convertObject(obj: IQuarksObject, parentUuid: string | null, groups: Map<string, IGroup>, emitters: Map<string, IEmitter>, depth: number): IGroup | IEmitter | null {
		const indent = "  ".repeat(depth);

		if (!obj || typeof obj !== "object") {
			return null;
		}

		this._logger.log(`${indent}Converting object: ${obj.type || "unknown"} (name: ${obj.name || "unnamed"})`);

		// Convert transform from right-handed to left-handed
		const transform = this._convertTransform(obj.matrix, obj.position, obj.rotation, obj.scale);

		if (obj.type === "Group") {
			const group: IGroup = {
				uuid: obj.uuid || `group_${groups.size}`,
				name: obj.name || "Group",
				transform,
				children: [],
			};

			// Convert children
			if (obj.children && Array.isArray(obj.children)) {
				for (const child of obj.children) {
					const convertedChild = this._convertObject(child, group.uuid, groups, emitters, depth + 1);
					if (convertedChild) {
						if ("config" in convertedChild) {
							// It's an emitter
							group.children.push(convertedChild as IEmitter);
						} else {
							// It's a group
							group.children.push(convertedChild as IGroup);
						}
					}
				}
			}

			groups.set(group.uuid, group);
			this._logger.log(`${indent}Converted Group: ${group.name} (uuid: ${group.uuid})`);
			return group;
		} else if (obj.type === "ParticleEmitter" && obj.ps) {
			// Convert emitter config from IQuarks to  format
			const Config = this._convertEmitterConfig(obj.ps);

			const emitter: IEmitter = {
				uuid: obj.uuid || `emitter_${emitters.size}`,
				name: obj.name || "ParticleEmitter",
				transform,
				config: Config,
				materialId: obj.ps.material,
				parentUuid: parentUuid || undefined,
				systemType: Config.systemType, // systemType is set in _convertEmitterConfig
				matrix: obj.matrix, // Store original matrix for rotation extraction
			};

			emitters.set(emitter.uuid, emitter);
			this._logger.log(`${indent}Converted Emitter: ${emitter.name} (uuid: ${emitter.uuid}, systemType: ${Config.systemType})`);
			return emitter;
		}

		return null;
	}

	/**
	 * Convert transform from IQuarks/Three.js (right-handed) to Babylon.js  (left-handed)
	 * This is the ONLY place where handedness conversion happens
	 */
	private _convertTransform(matrixArray?: number[], positionArray?: number[], rotationArray?: number[], scaleArray?: number[]): ITransform {
		const position = Vector3.Zero();
		const rotation = Quaternion.Identity();
		const scale = Vector3.One();

		if (matrixArray && Array.isArray(matrixArray) && matrixArray.length >= 16) {
			// Use matrix (most accurate)
			const matrix = Matrix.FromArray(matrixArray);
			const tempPos = Vector3.Zero();
			const tempRot = Quaternion.Zero();
			const tempScale = Vector3.Zero();
			matrix.decompose(tempScale, tempRot, tempPos);

			// Convert from right-handed to left-handed
			position.copyFrom(tempPos);
			position.z = -position.z; // Negate Z position

			rotation.copyFrom(tempRot);
			// Convert rotation quaternion: invert X component for proper X-axis rotation conversion
			// This handles the case where X=-90° in RH looks like X=0° in LH
			rotation.x *= -1;

			scale.copyFrom(tempScale);
		} else {
			// Use individual components
			if (positionArray && Array.isArray(positionArray)) {
				position.set(positionArray[0] || 0, positionArray[1] || 0, positionArray[2] || 0);
				position.z = -position.z; // Convert to left-handed
			}

			if (rotationArray && Array.isArray(rotationArray)) {
				// If rotation is Euler angles, convert to quaternion
				const eulerX = rotationArray[0] || 0;
				const eulerY = rotationArray[1] || 0;
				const eulerZ = rotationArray[2] || 0;
				Quaternion.RotationYawPitchRollToRef(eulerY, eulerX, -eulerZ, rotation); // Negate Z for handedness
				rotation.x *= -1; // Adjust X rotation component
			}

			if (scaleArray && Array.isArray(scaleArray)) {
				scale.set(scaleArray[0] || 1, scaleArray[1] || 1, scaleArray[2] || 1);
			}
		}

		return {
			position,
			rotation,
			scale,
		};
	}

	/**
	 * Convert emitter config from IQuarks to  format
	 */
	private _convertEmitterConfig(IQuarksConfig: IQuarksParticleEmitterConfig): IParticleSystemConfig {
		// Determine system type based on renderMode: 2 = solid, otherwise base
		const systemType: "solid" | "base" = IQuarksConfig.renderMode === 2 ? "solid" : "base";

		// Convert duration/looping to native targetStopDuration
		// In Babylon.js: targetStopDuration = 0 means infinite loop
		const duration = IQuarksConfig.duration ?? 5;
		const targetStopDuration = IQuarksConfig.looping ? 0 : duration;

		// Convert prewarm to native preWarmCycles
		// In Babylon.js: preWarmCycles > 0 means prewarm enabled
		let preWarmCycles = 0;
		let preWarmStepOffset = 0.016;
		if (IQuarksConfig.prewarm) {
			preWarmCycles = Math.ceil(duration * 60); // Simulate ~60fps for duration
			preWarmStepOffset = 1 / 60;
		}

		// Convert worldSpace to native isLocal (inverse)
		const isLocal = IQuarksConfig.worldSpace === undefined ? false : !IQuarksConfig.worldSpace;

		// Convert autoDestroy to native disposeOnStop
		const disposeOnStop = IQuarksConfig.autoDestroy ?? false;

		const Config: IParticleSystemConfig = {
			version: IQuarksConfig.version,
			systemType,
			// Native properties
			targetStopDuration,
			preWarmCycles,
			preWarmStepOffset,
			isLocal,
			disposeOnStop,
			// Other properties
			instancingGeometry: IQuarksConfig.instancingGeometry, // Custom geometry for SPS
			renderOrder: IQuarksConfig.renderOrder,
			layers: IQuarksConfig.layers,
			// Sprite animation (ParticleSystem only)
			uTileCount: IQuarksConfig.uTileCount,
			vTileCount: IQuarksConfig.vTileCount,
		};

		// === Convert Quarks values to native Babylon.js properties ===

		// Convert startLife → minLifeTime, maxLifeTime, lifeTimeGradients
		if (IQuarksConfig.startLife !== undefined) {
			const lifeResult = this._convertValueToMinMax(IQuarksConfig.startLife);
			Config.minLifeTime = lifeResult.min;
			Config.maxLifeTime = lifeResult.max;
			if (lifeResult.gradients) {
				Config.lifeTimeGradients = lifeResult.gradients;
			}
		}

		// Convert startSpeed → minEmitPower, maxEmitPower
		if (IQuarksConfig.startSpeed !== undefined) {
			const speedResult = this._convertValueToMinMax(IQuarksConfig.startSpeed);
			Config.minEmitPower = speedResult.min;
			Config.maxEmitPower = speedResult.max;
		}

		// Convert startSize → minSize, maxSize, startSizeGradients
		if (IQuarksConfig.startSize !== undefined) {
			const sizeResult = this._convertValueToMinMax(IQuarksConfig.startSize);
			Config.minSize = sizeResult.min;
			Config.maxSize = sizeResult.max;
			if (sizeResult.gradients) {
				Config.startSizeGradients = sizeResult.gradients;
			}
		}

		// Convert startRotation → minInitialRotation, maxInitialRotation
		if (IQuarksConfig.startRotation !== undefined) {
			const rotResult = this._convertRotationToMinMax(IQuarksConfig.startRotation);
			Config.minInitialRotation = rotResult.min;
			Config.maxInitialRotation = rotResult.max;
		}

		// Convert startColor → color1, color2
		if (IQuarksConfig.startColor !== undefined) {
			const colorResult = this._convertColorToColor4(IQuarksConfig.startColor);
			Config.color1 = colorResult.color1;
			Config.color2 = colorResult.color2;
		} else {
		}

		// Convert emissionOverTime → emitRate, emitRateGradients
		if (IQuarksConfig.emissionOverTime !== undefined) {
			const emitResult = this._convertValueToMinMax(IQuarksConfig.emissionOverTime);
			Config.emitRate = emitResult.min; // Use min as base rate
			if (emitResult.gradients) {
				Config.emitRateGradients = emitResult.gradients;
			}
		}

		// emissionOverDistance - only for SPS, keep as Value
		if (IQuarksConfig.emissionOverDistance !== undefined) {
			Config.emissionOverDistance = this._convertValue(IQuarksConfig.emissionOverDistance);
		}

		// startTileIndex - for sprite animation (ParticleSystem only)
		if (IQuarksConfig.startTileIndex !== undefined) {
			Config.startTileIndex = this._convertValue(IQuarksConfig.startTileIndex);
		}

		// Convert shape
		if (IQuarksConfig.shape !== undefined) {
			Config.shape = this._convertShape(IQuarksConfig.shape);
		}

		// Convert emission bursts
		if (IQuarksConfig.emissionBursts !== undefined && Array.isArray(IQuarksConfig.emissionBursts)) {
			Config.emissionBursts = IQuarksConfig.emissionBursts.map((burst) => ({
				time: this._convertValue(burst.time),
				count: this._convertValue(burst.count),
			}));
		}

		// Convert behaviors
		if (IQuarksConfig.behaviors !== undefined && Array.isArray(IQuarksConfig.behaviors)) {
			Config.behaviors = IQuarksConfig.behaviors.map((behavior) => this._convertBehavior(behavior));
		}

		// Convert renderMode to systemType, billboardMode and isBillboardBased
		// IQuarks RenderMode:
		// 0 = BillBoard → systemType = "base", isBillboardBased = true, billboardMode = ALL (default)
		// 1 = StretchedBillBoard → systemType = "base", isBillboardBased = true, billboardMode = STRETCHED
		// 2 = Mesh → systemType = "solid", isBillboardBased = false (always)
		// 3 = Trail → systemType = "base", isBillboardBased = true, billboardMode = ALL (not directly supported, treat as billboard)
		// 4 = HorizontalBillBoard → systemType = "base", isBillboardBased = true, billboardMode = Y
		// 5 = VerticalBillBoard → systemType = "base", isBillboardBased = true, billboardMode = Y (same as horizontal)
		if (IQuarksConfig.renderMode !== undefined) {
			if (IQuarksConfig.renderMode === 0) {
				// BillBoard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
			} else if (IQuarksConfig.renderMode === 1) {
				// StretchedBillBoard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
			} else if (IQuarksConfig.renderMode === 2) {
				// Mesh (SolidParticleSystem) - always false
				Config.isBillboardBased = false;
				// billboardMode not applicable for mesh
			} else if (IQuarksConfig.renderMode === 3) {
				// Trail - not directly supported, treat as billboard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
			} else if (IQuarksConfig.renderMode === 4 || IQuarksConfig.renderMode === 5) {
				// HorizontalBillBoard or VerticalBillBoard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_Y;
			} else {
				// Unknown renderMode, default to billboard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
			}
		} else {
			// Default: billboard mode
			Config.isBillboardBased = true;
			Config.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
		}

		return Config;
	}

	/**
	 * Convert IQuarks value to  value
	 */
	private _convertValue(IQuarksValue: IQuarksValue): Value {
		if (typeof IQuarksValue === "number") {
			return IQuarksValue;
		}
		if (IQuarksValue.type === "ConstantValue") {
			return {
				type: "ConstantValue",
				value: IQuarksValue.value,
			};
		}
		if (IQuarksValue.type === "IntervalValue") {
			return {
				type: "IntervalValue",
				min: IQuarksValue.a ?? 0,
				max: IQuarksValue.b ?? 0,
			};
		}
		if (IQuarksValue.type === "PiecewiseBezier") {
			return {
				type: "PiecewiseBezier",
				functions: IQuarksValue.functions.map((f) => ({
					function: f.function,
					start: f.start,
				})),
			};
		}
		return IQuarksValue;
	}

	/**
	 * Convert IQuarks value to native Babylon.js min/max + gradients
	 * - ConstantValue → min = max = value
	 * - IntervalValue → min = a, max = b
	 * - PiecewiseBezier → gradients array
	 */
	private _convertValueToMinMax(IQuarksValue: IQuarksValue): { min: number; max: number; gradients?: Array<{ gradient: number; factor: number; factor2?: number }> } {
		if (typeof IQuarksValue === "number") {
			return { min: IQuarksValue, max: IQuarksValue };
		}
		if (IQuarksValue.type === "ConstantValue") {
			return { min: IQuarksValue.value, max: IQuarksValue.value };
		}
		if (IQuarksValue.type === "IntervalValue") {
			return { min: IQuarksValue.a ?? 0, max: IQuarksValue.b ?? 0 };
		}
		if (IQuarksValue.type === "PiecewiseBezier" && IQuarksValue.functions) {
			// Convert PiecewiseBezier to gradients
			const gradients: Array<{ gradient: number; factor: number; factor2?: number }> = [];
			let minVal = Infinity;
			let maxVal = -Infinity;

			for (const func of IQuarksValue.functions) {
				const startTime = func.start;
				// Evaluate bezier at start and end points
				const startValue = this._evaluateBezierAt(func.function, 0);
				const endValue = this._evaluateBezierAt(func.function, 1);

				gradients.push({ gradient: startTime, factor: startValue });

				// Track min/max for fallback
				minVal = Math.min(minVal, startValue, endValue);
				maxVal = Math.max(maxVal, startValue, endValue);
			}

			// Add final point at gradient 1.0 if not present
			if (gradients.length > 0 && gradients[gradients.length - 1].gradient < 1) {
				const lastFunc = IQuarksValue.functions[IQuarksValue.functions.length - 1];
				const endValue = this._evaluateBezierAt(lastFunc.function, 1);
				gradients.push({ gradient: 1, factor: endValue });
			}

			return {
				min: minVal === Infinity ? 1 : minVal,
				max: maxVal === -Infinity ? 1 : maxVal,
				gradients: gradients.length > 0 ? gradients : undefined,
			};
		}
		return { min: 1, max: 1 };
	}

	/**
	 * Evaluate bezier curve at time t
	 * Bezier format: { p0, p1, p2, p3 } for cubic bezier
	 */
	private _evaluateBezierAt(bezier: { p0: number; p1: number; p2: number; p3: number }, t: number): number {
		const { p0, p1, p2, p3 } = bezier;
		const t2 = t * t;
		const t3 = t2 * t;
		const mt = 1 - t;
		const mt2 = mt * mt;
		const mt3 = mt2 * mt;
		return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
	}

	/**
	 * Convert IQuarks rotation to native min/max radians
	 * Supports: number, ConstantValue, IntervalValue, Euler, AxisAngle, RandomQuat
	 */
	private _convertRotationToMinMax(IQuarksRotation: IQuarksRotation): { min: number; max: number } {
		if (typeof IQuarksRotation === "number") {
			return { min: IQuarksRotation, max: IQuarksRotation };
		}

		if (typeof IQuarksRotation === "object" && IQuarksRotation !== null && "type" in IQuarksRotation) {
			const rotationType = IQuarksRotation.type;

			if (rotationType === "ConstantValue") {
				const val = (IQuarksRotation as any).value ?? 0;
				return { min: val, max: val };
			}

			if (rotationType === "IntervalValue") {
				return { min: (IQuarksRotation as any).a ?? 0, max: (IQuarksRotation as any).b ?? 0 };
			}

			// Handle Euler type - for 2D/billboard particles we use angleZ
			if (rotationType === "Euler") {
				const euler = IQuarksRotation as any;
				// angleZ is the rotation around forward axis (most common for 2D particles)
				const angleZ = euler.angleZ;
				if (angleZ) {
					if (typeof angleZ === "number") {
						return { min: angleZ, max: angleZ };
					}
					if (angleZ.type === "ConstantValue") {
						const val = angleZ.value ?? 0;
						return { min: val, max: val };
					}
					if (angleZ.type === "IntervalValue") {
						return { min: angleZ.a ?? 0, max: angleZ.b ?? 0 };
					}
				}
				// Fallback to angleX if no angleZ (for different orientations)
				const angleX = euler.angleX;
				if (angleX) {
					if (typeof angleX === "number") {
						return { min: angleX, max: angleX };
					}
					if (angleX.type === "ConstantValue") {
						const val = angleX.value ?? 0;
						return { min: val, max: val };
					}
					if (angleX.type === "IntervalValue") {
						return { min: angleX.a ?? 0, max: angleX.b ?? 0 };
					}
				}
				return { min: 0, max: 0 };
			}
		}

		return { min: 0, max: 0 };
	}

	/**
	 * Convert IQuarks color to native Babylon.js Color4 (color1, color2)
	 */
	private _convertColorToColor4(IQuarksColor: IQuarksColor): { color1: Color4; color2: Color4 } {
		if (Array.isArray(IQuarksColor)) {
			const c = new Color4(IQuarksColor[0] ?? 1, IQuarksColor[1] ?? 1, IQuarksColor[2] ?? 1, IQuarksColor[3] ?? 1);
			return { color1: c, color2: c };
		}

		if (typeof IQuarksColor === "object" && IQuarksColor !== null && "type" in IQuarksColor) {
			if (IQuarksColor.type === "ConstantColor") {
				const constColor = IQuarksColor as any;
				if (constColor.value && Array.isArray(constColor.value)) {
					const c = new Color4(constColor.value[0] ?? 1, constColor.value[1] ?? 1, constColor.value[2] ?? 1, constColor.value[3] ?? 1);
					return { color1: c, color2: c };
				}
				if (constColor.color) {
					const colorObj = constColor.color;
					const c = new Color4(
						colorObj.r !== undefined ? colorObj.r : 1,
						colorObj.g !== undefined ? colorObj.g : 1,
						colorObj.b !== undefined ? colorObj.b : 1,
						colorObj.a !== undefined ? colorObj.a : 1
					);
					return { color1: c, color2: c };
				}
			}
			// Handle RandomColor (interpolation between two colors)
			const anyColor = IQuarksColor as any;
			if (anyColor.type === "RandomColor" && anyColor.a && anyColor.b) {
				const color1 = new Color4(anyColor.a[0] ?? 1, anyColor.a[1] ?? 1, anyColor.a[2] ?? 1, anyColor.a[3] ?? 1);
				const color2 = new Color4(anyColor.b[0] ?? 1, anyColor.b[1] ?? 1, anyColor.b[2] ?? 1, anyColor.b[3] ?? 1);
				return { color1, color2 };
			}
		}

		// Default white
		return { color1: new Color4(1, 1, 1, 1), color2: new Color4(1, 1, 1, 1) };
	}

	/**
	 * Convert IQuarks gradient key to  gradient key
	 */
	private _convertGradientKey(IQuarksKey: IQuarksGradientKey): IGradientKey {
		return {
			time: IQuarksKey.time,
			value: IQuarksKey.value,
			pos: IQuarksKey.pos,
		};
	}

	/**
	 * Convert IQuarks shape to  shape
	 */
	private _convertShape(IQuarksShape: IQuarksShape): IShape {
		const Shape: IShape = {
			type: IQuarksShape.type,
			radius: IQuarksShape.radius,
			arc: IQuarksShape.arc,
			thickness: IQuarksShape.thickness,
			angle: IQuarksShape.angle,
			mode: IQuarksShape.mode,
			spread: IQuarksShape.spread,
			size: IQuarksShape.size,
			height: IQuarksShape.height,
		};
		if (IQuarksShape.speed !== undefined) {
			Shape.speed = this._convertValue(IQuarksShape.speed);
		}
		return Shape;
	}

	/**
	 * Convert IQuarks behavior to  behavior
	 */
	private _convertBehavior(IQuarksBehavior: IQuarksBehavior): Behavior {
		switch (IQuarksBehavior.type) {
			case "ColorOverLife": {
				const behavior = IQuarksBehavior as IQuarksColorOverLifeBehavior;
				if (behavior.color) {
					const Color: IColorOverLifeBehavior["color"] = {};
					if (behavior.color.color?.keys) {
						Color.color = { keys: behavior.color.color.keys.map((k) => this._convertGradientKey(k)) };
					}
					if (behavior.color.alpha?.keys) {
						Color.alpha = { keys: behavior.color.alpha.keys.map((k) => this._convertGradientKey(k)) };
					}
					if (behavior.color.keys) {
						Color.keys = behavior.color.keys.map((k) => this._convertGradientKey(k));
					}
					return { type: "ColorOverLife", color: Color };
				}
				return { type: "ColorOverLife" };
			}

			case "SizeOverLife": {
				const behavior = IQuarksBehavior as IQuarksSizeOverLifeBehavior;
				if (behavior.size) {
					const Size: ISizeOverLifeBehavior["size"] = {};
					if (behavior.size.keys) {
						Size.keys = behavior.size.keys.map((k: IQuarksGradientKey) => this._convertGradientKey(k));
					}
					if (behavior.size.functions) {
						Size.functions = behavior.size.functions;
					}
					return { type: "SizeOverLife", size: Size };
				}
				return { type: "SizeOverLife" };
			}

			case "RotationOverLife":
			case "Rotation3DOverLife": {
				const behavior = IQuarksBehavior as IQuarksRotationOverLifeBehavior;
				return {
					type: behavior.type,
					angularVelocity: behavior.angularVelocity !== undefined ? this._convertValue(behavior.angularVelocity) : undefined,
				};
			}

			case "ForceOverLife":
			case "ApplyForce": {
				const behavior = IQuarksBehavior as IQuarksForceOverLifeBehavior;
				const Behavior: IForceOverLifeBehavior = { type: behavior.type };
				if (behavior.force) {
					Behavior.force = {
						x: behavior.force.x !== undefined ? this._convertValue(behavior.force.x) : undefined,
						y: behavior.force.y !== undefined ? this._convertValue(behavior.force.y) : undefined,
						z: behavior.force.z !== undefined ? this._convertValue(behavior.force.z) : undefined,
					};
				}
				if (behavior.x !== undefined) {
					Behavior.x = this._convertValue(behavior.x);
				}
				if (behavior.y !== undefined) {
					Behavior.y = this._convertValue(behavior.y);
				}
				if (behavior.z !== undefined) {
					Behavior.z = this._convertValue(behavior.z);
				}
				return Behavior;
			}

			case "GravityForce": {
				const behavior = IQuarksBehavior as IQuarksGravityForceBehavior;
				const Behavior: { type: string; gravity?: Value } = {
					type: "GravityForce",
					gravity: behavior.gravity !== undefined ? this._convertValue(behavior.gravity) : undefined,
				};
				return Behavior as Behavior;
			}

			case "SpeedOverLife": {
				const behavior = IQuarksBehavior as IQuarksSpeedOverLifeBehavior;
				if (behavior.speed) {
					if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed) {
						const Speed: ISpeedOverLifeBehavior["speed"] = {};
						if (behavior.speed.keys) {
							Speed.keys = behavior.speed.keys.map((k: IQuarksGradientKey) => this._convertGradientKey(k));
						}
						if (behavior.speed.functions) {
							Speed.functions = behavior.speed.functions;
						}
						return { type: "SpeedOverLife", speed: Speed };
					} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
						return { type: "SpeedOverLife", speed: this._convertValue(behavior.speed as IQuarksValue) };
					}
				}
				return { type: "SpeedOverLife" };
			}

			case "FrameOverLife": {
				const behavior = IQuarksBehavior as IQuarksFrameOverLifeBehavior;
				const Behavior: { type: string; frame?: Value | { keys?: IGradientKey[] } } = { type: "FrameOverLife" };
				if (behavior.frame) {
					if (typeof behavior.frame === "object" && behavior.frame !== null && "keys" in behavior.frame) {
						Behavior.frame = {
							keys: behavior.frame.keys?.map((k: IQuarksGradientKey) => this._convertGradientKey(k)),
						};
					} else if (typeof behavior.frame === "number" || (typeof behavior.frame === "object" && behavior.frame !== null && "type" in behavior.frame)) {
						Behavior.frame = this._convertValue(behavior.frame as IQuarksValue);
					}
				}
				return Behavior as Behavior;
			}

			case "LimitSpeedOverLife": {
				const behavior = IQuarksBehavior as IQuarksLimitSpeedOverLifeBehavior;
				const Behavior: ILimitSpeedOverLifeBehavior = { type: "LimitSpeedOverLife" };
				if (behavior.maxSpeed !== undefined) {
					Behavior.maxSpeed = this._convertValue(behavior.maxSpeed);
				}
				if (behavior.speed !== undefined) {
					if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed) {
						Behavior.speed = { keys: behavior.speed.keys?.map((k: IQuarksGradientKey) => this._convertGradientKey(k)) };
					} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
						Behavior.speed = this._convertValue(behavior.speed as IQuarksValue);
					}
				}
				if (behavior.dampen !== undefined) {
					Behavior.dampen = this._convertValue(behavior.dampen);
				}
				return Behavior;
			}

			case "ColorBySpeed": {
				const behavior = IQuarksBehavior as IQuarksColorBySpeedBehavior;
				const Behavior: IColorBySpeedBehavior = {
					type: "ColorBySpeed",
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				if (behavior.color?.keys) {
					Behavior.color = { keys: behavior.color.keys.map((k: IQuarksGradientKey) => this._convertGradientKey(k)) };
				}
				return Behavior;
			}

			case "SizeBySpeed": {
				const behavior = IQuarksBehavior as IQuarksSizeBySpeedBehavior;
				const Behavior: ISizeBySpeedBehavior = {
					type: "SizeBySpeed",
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				if (behavior.size?.keys) {
					Behavior.size = { keys: behavior.size.keys.map((k: IQuarksGradientKey) => this._convertGradientKey(k)) };
				}
				return Behavior;
			}

			case "RotationBySpeed": {
				const behavior = IQuarksBehavior as IQuarksRotationBySpeedBehavior;
				const Behavior: { type: string; angularVelocity?: Value; minSpeed?: Value; maxSpeed?: Value } = {
					type: "RotationBySpeed",
					angularVelocity: behavior.angularVelocity !== undefined ? this._convertValue(behavior.angularVelocity) : undefined,
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				return Behavior as Behavior;
			}

			case "OrbitOverLife": {
				const behavior = IQuarksBehavior as IQuarksOrbitOverLifeBehavior;
				const Behavior: { type: string; center?: { x?: number; y?: number; z?: number }; radius?: Value; speed?: Value } = {
					type: "OrbitOverLife",
					center: behavior.center,
					radius: behavior.radius !== undefined ? this._convertValue(behavior.radius) : undefined,
					speed: behavior.speed !== undefined ? this._convertValue(behavior.speed) : undefined,
				};
				return Behavior as Behavior;
			}

			default:
				// Fallback for unknown behaviors - copy as-is
				return IQuarksBehavior as Behavior;
		}
	}

	/**
	 * Convert IQuarks materials to  materials
	 */
	private _convertMaterials(IQuarksMaterials: IQuarksMaterial[]): IMaterial[] {
		return IQuarksMaterials.map((IQuarks) => {
			const material: IMaterial = {
				uuid: IQuarks.uuid,
				type: IQuarks.type,
				transparent: IQuarks.transparent,
				depthWrite: IQuarks.depthWrite,
				side: IQuarks.side,
				map: IQuarks.map,
			};

			// Convert color from hex to Color3
			if (IQuarks.color !== undefined) {
				const colorHex = typeof IQuarks.color === "number" ? IQuarks.color : parseInt(String(IQuarks.color).replace("#", ""), 16) || 0xffffff;
				const r = ((colorHex >> 16) & 0xff) / 255;
				const g = ((colorHex >> 8) & 0xff) / 255;
				const b = (colorHex & 0xff) / 255;
				material.color = new Color3(r, g, b);
			}

			// Convert blending mode (Three.js → Babylon.js)
			if (IQuarks.blending !== undefined) {
				const blendModeMap: Record<number, number> = {
					0: 0, // NoBlending → ALPHA_DISABLE
					1: 1, // NormalBlending → ALPHA_COMBINE
					2: 2, // AdditiveBlending → ALPHA_ADD
				};
				material.blending = blendModeMap[IQuarks.blending] ?? IQuarks.blending;
			}

			return material;
		});
	}

	/**
	 * Convert IQuarks textures to  textures
	 */
	private _convertTextures(IQuarksTextures: IQuarksTexture[]): ITexture[] {
		return IQuarksTextures.map((IQuarks) => {
			const texture: ITexture = {
				uuid: IQuarks.uuid,
				image: IQuarks.image,
				generateMipmaps: IQuarks.generateMipmaps,
				flipY: IQuarks.flipY,
			};

			// Convert wrap mode (Three.js → Babylon.js)
			if (IQuarks.wrap && Array.isArray(IQuarks.wrap)) {
				const wrapModeMap: Record<number, number> = {
					1000: BabylonTexture.WRAP_ADDRESSMODE, // RepeatWrapping
					1001: BabylonTexture.CLAMP_ADDRESSMODE, // ClampToEdgeWrapping
					1002: BabylonTexture.MIRROR_ADDRESSMODE, // MirroredRepeatWrapping
				};
				texture.wrapU = wrapModeMap[IQuarks.wrap[0]] ?? BabylonTexture.WRAP_ADDRESSMODE;
				texture.wrapV = wrapModeMap[IQuarks.wrap[1]] ?? BabylonTexture.WRAP_ADDRESSMODE;
			}

			// Convert repeat to scale
			if (IQuarks.repeat && Array.isArray(IQuarks.repeat)) {
				texture.uScale = IQuarks.repeat[0] || 1;
				texture.vScale = IQuarks.repeat[1] || 1;
			}

			// Convert offset
			if (IQuarks.offset && Array.isArray(IQuarks.offset)) {
				texture.uOffset = IQuarks.offset[0] || 0;
				texture.vOffset = IQuarks.offset[1] || 0;
			}

			// Convert rotation
			if (IQuarks.rotation !== undefined) {
				texture.uAng = IQuarks.rotation;
			}

			// Convert channel
			if (typeof IQuarks.channel === "number") {
				texture.coordinatesIndex = IQuarks.channel;
			}

			// Convert sampling mode (Three.js filters → Babylon.js sampling mode)
			if (IQuarks.minFilter !== undefined) {
				if (IQuarks.minFilter === 1008 || IQuarks.minFilter === 1009) {
					texture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
				} else if (IQuarks.minFilter === 1007 || IQuarks.minFilter === 1006) {
					texture.samplingMode = BabylonTexture.BILINEAR_SAMPLINGMODE;
				} else {
					texture.samplingMode = BabylonTexture.NEAREST_SAMPLINGMODE;
				}
			} else if (IQuarks.magFilter !== undefined) {
				texture.samplingMode = IQuarks.magFilter === 1006 ? BabylonTexture.BILINEAR_SAMPLINGMODE : BabylonTexture.NEAREST_SAMPLINGMODE;
			} else {
				texture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
			}

			return texture;
		});
	}

	/**
	 * Convert IQuarks images to  images (normalize URLs)
	 */
	private _convertImages(IQuarksImages: IQuarksImage[]): IImage[] {
		return IQuarksImages.map((IQuarks) => ({
			uuid: IQuarks.uuid,
			url: IQuarks.url || "",
		}));
	}

	/**
	 * Convert IQuarks geometries to  geometries (convert to left-handed)
	 */
	private _convertGeometries(IQuarksGeometries: IQuarksGeometry[]): IGeometry[] {
		return IQuarksGeometries.map((IQuarks) => {
			if (IQuarks.type === "PlaneGeometry") {
				// PlaneGeometry - simple properties
				const geometry: IGeometry = {
					uuid: IQuarks.uuid,
					type: "PlaneGeometry",
					width: (IQuarks as any).width ?? 1,
					height: (IQuarks as any).height ?? 1,
				};
				return geometry;
			} else if (IQuarks.type === "BufferGeometry") {
				// BufferGeometry - convert attributes to left-handed
				const geometry: IGeometry = {
					uuid: IQuarks.uuid,
					type: "BufferGeometry",
				};

				if (IQuarks.data?.attributes) {
					const attributes: IGeometryData["attributes"] = {};
					const IQuarksAttrs = IQuarks.data.attributes;

					// Convert position (right-hand → left-hand: flip Z)
					if (IQuarksAttrs.position) {
						const positions = Array.from(IQuarksAttrs.position.array);
						// Flip Z coordinate for left-handed system
						for (let i = 2; i < positions.length; i += 3) {
							positions[i] = -positions[i];
						}
						attributes.position = {
							array: positions,
							itemSize: IQuarksAttrs.position.itemSize,
						};
					}

					// Convert normal (right-hand → left-hand: flip Z)
					if (IQuarksAttrs.normal) {
						const normals = Array.from(IQuarksAttrs.normal.array);
						for (let i = 2; i < normals.length; i += 3) {
							normals[i] = -normals[i];
						}
						attributes.normal = {
							array: normals,
							itemSize: IQuarksAttrs.normal.itemSize,
						};
					}

					// UV and color - no conversion needed
					if (IQuarksAttrs.uv) {
						attributes.uv = {
							array: Array.from(IQuarksAttrs.uv.array),
							itemSize: IQuarksAttrs.uv.itemSize,
						};
					}

					if (IQuarksAttrs.color) {
						attributes.color = {
							array: Array.from(IQuarksAttrs.color.array),
							itemSize: IQuarksAttrs.color.itemSize,
						};
					}

					geometry.data = {
						attributes,
					};

					// Convert indices (reverse winding order for left-handed)
					if (IQuarks.data.index) {
						const indices = Array.from(IQuarks.data.index.array);
						// Reverse winding: swap every 2nd and 3rd index in each triangle
						for (let i = 0; i < indices.length; i += 3) {
							const temp = indices[i + 1];
							indices[i + 1] = indices[i + 2];
							indices[i + 2] = temp;
						}
						geometry.data.index = {
							array: indices,
						};
					}
				}

				return geometry;
			}

			// Unknown geometry type - return as-is
			return {
				uuid: IQuarks.uuid,
				type: IQuarks.type as "PlaneGeometry" | "BufferGeometry",
			};
		});
	}
}
