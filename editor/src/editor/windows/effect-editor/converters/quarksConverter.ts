import { Vector3, Matrix, Quaternion, Color3, Texture as BabylonTexture, ParticleSystem, Color4, Tools } from "babylonjs";
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
	IQuarksStartSize,
	IQuarksStartColor,
	IQuarksRotation,
	IQuarksGradientKey,
	IQuarksShape,
	IQuarksColorOverLifeBehavior,
	IQuarksGradientColor,
	IQuarksConstantColorColor,
	IQuarksRandomColorBetweenGradient,
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
} from "./quarksTypes";
import type {
	ITransform,
	IGroup,
	IEmitter,
	IData,
	IMaterial,
	ITexture,
	IImage,
	IGeometry,
	IGeometryData,
	IParticleSystemConfig,
	Behavior,
	IColorFunction,
	IForceOverLifeBehavior,
	ISpeedOverLifeBehavior,
	ILimitSpeedOverLifeBehavior,
	ISizeBySpeedBehavior,
	Value,
	IGradientKey,
	IShape,
} from "babylonjs-editor-tools";

/**
 * Converts Quarks Effect to Babylon.js Effect format
 * All coordinate system conversions happen here, once
 */
export class QuarksConverter {
	// Constants
	private static readonly DEFAULT_DURATION = 5;
	private static readonly DEFAULT_COLOR = { r: 1, g: 1, b: 1, a: 1 };
	private static readonly DEFAULT_COLOR_HEX = 0xffffff;
	private static readonly PREWARM_FPS = 60;
	private static readonly DEFAULT_PREWARM_STEP_OFFSET = 1 / QuarksConverter.PREWARM_FPS;

	// Three.js constants
	private static readonly THREE_REPEAT_WRAPPING = 1000;
	private static readonly THREE_CLAMP_TO_EDGE_WRAPPING = 1001;
	private static readonly THREE_MIRRORED_REPEAT_WRAPPING = 1002;
	private static readonly THREE_LINEAR_FILTER = 1006;
	private static readonly THREE_NEAREST_MIPMAP_NEAREST_FILTER = 1007;
	private static readonly THREE_LINEAR_MIPMAP_NEAREST_FILTER = 1008;
	private static readonly THREE_NEAREST_MIPMAP_LINEAR_FILTER = 1009;
	/**
	 * Convert Quarks Effect to Babylon.js Effect format
	 * Handles errors gracefully and returns partial data if conversion fails
	 */
	public convert(data: IQuarksJSON): IData {
		let root: IGroup | IEmitter | null = null;

		try {
			root = this._convertObject(data.object, null);
		} catch (error) {
			console.error(`Failed to convert root object: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Convert all resources with error handling
		const materials = this._convertResources(data.materials, (m) => this._convertMaterial(m), "materials");
		const textures = this._convertResources(data.textures, (t) => this._convertTexture(t), "textures");
		const images = this._convertResources(data.images, (i) => this._convertImage(i), "images");
		const geometries = this._convertResources(data.geometries, (g) => this._convertGeometry(g), "geometries");

		return {
			root,
			materials,
			textures,
			images,
			geometries,
		};
	}

	/**
	 * Helper: Convert resources array with error handling
	 */
	private _convertResources<T, R>(items: T[] | undefined, converter: (item: T) => R, resourceName: string): R[] {
		try {
			return (items || []).map(converter);
		} catch (error) {
			console.error(`Failed to convert ${resourceName}: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	}

	/**
	 * Convert a IQuarks object to Babylon.js  format
	 */
	private _convertObject(obj: IQuarksObject, parentUuid: string | null): IGroup | IEmitter | null {
		if (!obj || typeof obj !== "object") {
			return null;
		}

		// Convert transform from right-handed to left-handed
		const transform = this._convertTransform(obj.matrix, obj.position, obj.rotation, obj.scale);

		if (obj.type === "Group") {
			const group: IGroup = {
				uuid: obj.uuid || Tools.RandomId(),
				name: obj.name || "Group",
				transform,
				children: [],
			};

			// Convert children
			if (obj.children && Array.isArray(obj.children)) {
				for (const child of obj.children) {
					const convertedChild = this._convertObject(child, group.uuid);
					if (convertedChild) {
						group.children.push(convertedChild);
					}
				}
			}

			return group;
		} else if (obj.type === "ParticleEmitter" && obj.ps) {
			// Convert emitter config from IQuarks to  format
			const config = this._convertEmitterConfig(obj.ps);

			const emitter: IEmitter = {
				uuid: obj.uuid || Tools.RandomId(),
				name: obj.name || "ParticleEmitter",
				transform,
				config,
				materialId: obj.ps.material,
				parentUuid: parentUuid ?? undefined,
				systemType: config.systemType, // systemType is set in _convertEmitterConfig
				matrix: obj.matrix, // Store original matrix for rotation extraction
			};

			return emitter;
		}

		return null;
	}

	/**
	 * Convert transform from IQuarks (right-handed) to Babylon.js  (left-handed)
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
	private _convertEmitterConfig(config: IQuarksParticleEmitterConfig): IParticleSystemConfig {
		const result = this._convertBasicEmitterConfig(config);
		this._convertLifeProperties(config, result);
		this._convertEmissionProperties(config, result);
		this._convertVisualProperties(config, result);
		this._convertBehaviorsAndShape(config, result);
		this._convertBillboardConfig(config, result);
		return result;
	}

	/**
	 * Convert basic emitter configuration (system type, duration, prewarm, etc.)
	 */
	private _convertBasicEmitterConfig(config: IQuarksParticleEmitterConfig): IParticleSystemConfig {
		const systemType: "solid" | "base" = config.renderMode === 2 ? "solid" : "base";
		const duration = config.duration ?? QuarksConverter.DEFAULT_DURATION;
		const targetStopDuration = config.looping ? 0 : duration;

		// Convert prewarm to native preWarmCycles
		let preWarmCycles = 0;
		let preWarmStepOffset = QuarksConverter.DEFAULT_PREWARM_STEP_OFFSET;
		if (config.prewarm) {
			preWarmCycles = Math.ceil(duration * QuarksConverter.PREWARM_FPS);
			preWarmStepOffset = QuarksConverter.DEFAULT_PREWARM_STEP_OFFSET;
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
	private _convertLifeProperties(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
		if (config.startLife !== undefined) {
			const lifeResult = this._convertValueToMinMax(config.startLife);
			result.minLifeTime = lifeResult.min;
			result.maxLifeTime = lifeResult.max;
			if (lifeResult.gradients) {
				result.lifeTimeGradients = lifeResult.gradients;
			}
		}

		if (config.startSize !== undefined) {
			const sizeResult = this._convertStartSizeToMinMax(config.startSize);
			result.minSize = sizeResult.min;
			result.maxSize = sizeResult.max;
			if (sizeResult.gradients) {
				result.startSizeGradients = sizeResult.gradients;
			}
		}

		if (config.startRotation !== undefined) {
			const rotResult = this._convertRotationToMinMax(config.startRotation);
			result.minInitialRotation = rotResult.min;
			result.maxInitialRotation = rotResult.max;
		}

		if (config.startColor !== undefined) {
			const colorResult = this._convertStartColorToColor4(config.startColor);
			result.color1 = colorResult.color1;
			result.color2 = colorResult.color2;
		}
	}

	/**
	 * Convert emission-related properties (speed, rate, bursts)
	 */
	private _convertEmissionProperties(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
		if (config.startSpeed !== undefined) {
			const speedResult = this._convertValueToMinMax(config.startSpeed);
			result.minEmitPower = speedResult.min;
			result.maxEmitPower = speedResult.max;
		}

		if (config.emissionOverTime !== undefined) {
			const emitResult = this._convertValueToMinMax(config.emissionOverTime);
			result.emitRate = emitResult.min;
			if (emitResult.gradients) {
				result.emitRateGradients = emitResult.gradients;
			}
		}

		if (config.emissionOverDistance !== undefined) {
			result.emissionOverDistance = this._convertValue(config.emissionOverDistance);
		}

		if (config.emissionBursts !== undefined && Array.isArray(config.emissionBursts)) {
			result.emissionBursts = config.emissionBursts.map((burst) => ({
				time: this._convertValue(burst.time),
				count: this._convertValue(burst.count),
			}));
		}
	}

	/**
	 * Convert visual properties (sprite animation, shape)
	 */
	private _convertVisualProperties(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
		if (config.startTileIndex !== undefined) {
			result.startTileIndex = this._convertValue(config.startTileIndex);
		}

		if (config.shape !== undefined) {
			result.shape = this._convertShape(config.shape);
		}
	}

	/**
	 * Convert behaviors and shape
	 */
	private _convertBehaviorsAndShape(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
		if (config.behaviors !== undefined && Array.isArray(config.behaviors)) {
			result.behaviors = config.behaviors.map((behavior) => this._convertBehavior(behavior));
		}
	}

	/**
	 * Convert billboard configuration from renderMode
	 */
	private _convertBillboardConfig(config: IQuarksParticleEmitterConfig, result: IParticleSystemConfig): void {
		const billboardConfig = this._convertRenderMode(config.renderMode);
		result.isBillboardBased = billboardConfig.isBillboardBased;
		if (billboardConfig.billboardMode !== undefined) {
			result.billboardMode = billboardConfig.billboardMode;
		}
	}

	/**
	 * Helper: Convert optional IQuarksValue to optional Value
	 */
	private _convertOptionalValue(value: IQuarksValue | undefined): Value | undefined {
		return value !== undefined ? this._convertValue(value) : undefined;
	}

	/**
	 * Helper: Convert array of gradient keys
	 */
	private _convertGradientKeys(keys: IQuarksGradientKey[] | undefined): IGradientKey[] {
		return keys ? keys.map((k) => this._convertGradientKey(k)) : [];
	}

	/**
	 * Helper: Convert speed/frame value (can be Value or object with keys)
	 */
	private _convertSpeedOrFrameValue(
		value: IQuarksValue | { keys?: IQuarksGradientKey[]; functions?: unknown[] } | undefined
	): Value | { keys?: IGradientKey[]; functions?: unknown[] } | undefined {
		if (value === undefined) {
			return undefined;
		}
		if (typeof value === "object" && value !== null && "keys" in value) {
			const result: { keys?: IGradientKey[]; functions?: unknown[] } = {};
			if (value.keys) {
				result.keys = this._convertGradientKeys(value.keys);
			}
			if ("functions" in value && value.functions) {
				result.functions = value.functions;
			}
			return result;
		}
		if (typeof value === "number" || (typeof value === "object" && value !== null && "type" in value)) {
			return this._convertValue(value as IQuarksValue);
		}
		return undefined;
	}

	/**
	 * Helper: Create Color4 from RGBA with fallbacks
	 */
	private _createColor4(r: number | undefined, g: number | undefined, b: number | undefined, a: number | undefined = 1): Color4 {
		return new Color4(r ?? 1, g ?? 1, b ?? 1, a ?? 1);
	}

	/**
	 * Helper: Create Color4 from array
	 */
	private _createColor4FromArray(arr: [number, number, number, number] | undefined): Color4 {
		return this._createColor4(arr?.[0], arr?.[1], arr?.[2], arr?.[3]);
	}

	/**
	 * Helper: Create Color4 from RGBA object
	 */
	private _createColor4FromRGBA(rgba: { r: number; g: number; b: number; a?: number } | undefined): Color4 {
		return rgba ? this._createColor4(rgba.r, rgba.g, rgba.b, rgba.a) : this._createColor4(1, 1, 1, 1);
	}

	/**
	 * Helper: Convert renderMode to billboard config
	 */
	private _convertRenderMode(renderMode: number | undefined): { isBillboardBased: boolean; billboardMode?: number } {
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

	/**
	 * Helper: Flip Z coordinate in array (for left-handed conversion)
	 */
	private _flipZCoordinate(array: number[], itemSize: number = 3): number[] {
		const result = Array.from(array);
		for (let i = itemSize - 1; i < result.length; i += itemSize) {
			result[i] = -result[i];
		}
		return result;
	}

	/**
	 * Helper: Convert attribute array
	 */
	private _convertAttribute(attr: { array: number[]; itemSize: number } | undefined, flipZ: boolean = false): { array: number[]; itemSize: number } | undefined {
		if (!attr) {
			return undefined;
		}
		return {
			array: flipZ ? this._flipZCoordinate(attr.array, attr.itemSize) : Array.from(attr.array),
			itemSize: attr.itemSize,
		};
	}

	/**
	 * Convert IQuarks value to  value
	 */
	private _convertValue(value: IQuarksValue): Value {
		if (typeof value === "number") {
			return value;
		}
		if (value.type === "ConstantValue") {
			return {
				type: "ConstantValue",
				value: value.value,
			};
		}
		if (value.type === "IntervalValue") {
			return {
				type: "IntervalValue",
				min: value.a ?? 0,
				max: value.b ?? 0,
			};
		}
		if (value.type === "PiecewiseBezier") {
			return {
				type: "PiecewiseBezier",
				functions: value.functions.map((f) => ({
					function: f.function,
					start: f.start,
				})),
			};
		}
		// Fallback: return as Value (should not happen with proper types)
		return value as Value;
	}

	/**
	 * Convert IQuarksStartSize to min/max (handles Vector3Function)
	 * - ConstantValue → min = max = value
	 * - IntervalValue → min = a, max = b
	 * - PiecewiseBezier → gradients array
	 */
	private _convertStartSizeToMinMax(startSize: IQuarksStartSize): { min: number; max: number; gradients?: Array<{ gradient: number; factor: number; factor2?: number }> } {
		// Handle Vector3Function type
		if (typeof startSize === "object" && startSize !== null && "type" in startSize && startSize.type === "Vector3Function") {
			// For Vector3Function, use the main value or average of x, y, z
			if (startSize.value !== undefined) {
				return this._convertValueToMinMax(startSize.value);
			}
			// Fallback: use x value if available
			if (startSize.x !== undefined) {
				return this._convertValueToMinMax(startSize.x);
			}
			return { min: 1, max: 1 };
		}
		// Otherwise treat as IQuarksValue
		return this._convertValueToMinMax(startSize as IQuarksValue);
	}

	private _convertValueToMinMax(value: IQuarksValue): { min: number; max: number; gradients?: Array<{ gradient: number; factor: number; factor2?: number }> } {
		if (typeof value === "number") {
			return { min: value, max: value };
		}
		if (value.type === "ConstantValue") {
			return { min: value.value, max: value.value };
		}
		if (value.type === "IntervalValue") {
			return { min: value.a ?? 0, max: value.b ?? 0 };
		}
		if (value.type === "PiecewiseBezier" && value.functions) {
			// Convert PiecewiseBezier to gradients
			const gradients: Array<{ gradient: number; factor: number; factor2?: number }> = [];
			let minVal = Infinity;
			let maxVal = -Infinity;

			for (const func of value.functions) {
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
				const lastFunc = value.functions[value.functions.length - 1];
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
	 * Helper: Extract min/max from IQuarksValue
	 */
	private _extractMinMaxFromValue(value: IQuarksValue | undefined): { min: number; max: number } {
		if (value === undefined) {
			return { min: 0, max: 0 };
		}
		if (typeof value === "number") {
			return { min: value, max: value };
		}
		if (value.type === "ConstantValue") {
			return { min: value.value, max: value.value };
		}
		if (value.type === "IntervalValue") {
			return { min: value.a ?? 0, max: value.b ?? 0 };
		}
		return { min: 0, max: 0 };
	}

	/**
	 * Convert IQuarks rotation to native min/max radians
	 * Supports: number, ConstantValue, IntervalValue, Euler, AxisAngle, RandomQuat
	 */
	private _convertRotationToMinMax(rotation: IQuarksRotation): { min: number; max: number } {
		if (typeof rotation === "number") {
			return { min: rotation, max: rotation };
		}

		if (typeof rotation === "object" && rotation !== null && "type" in rotation) {
			const rotationType = rotation.type;

			if (rotationType === "ConstantValue") {
				return this._extractMinMaxFromValue(rotation as IQuarksValue);
			}

			if (rotationType === "IntervalValue") {
				return this._extractMinMaxFromValue(rotation as IQuarksValue);
			}

			// Handle Euler type - for 2D/billboard particles we use angleZ, fallback to angleX
			if (rotationType === "Euler") {
				const euler = rotation as { type: string; angleZ?: IQuarksValue; angleX?: IQuarksValue };
				if (euler.angleZ !== undefined) {
					return this._extractMinMaxFromValue(euler.angleZ);
				}
				if (euler.angleX !== undefined) {
					return this._extractMinMaxFromValue(euler.angleX);
				}
			}
		}

		return { min: 0, max: 0 };
	}

	/**
	 * Convert IQuarksStartColor to native Babylon.js Color4 (color1, color2)
	 */
	private _convertStartColorToColor4(startColor: IQuarksStartColor): { color1: Color4; color2: Color4 } {
		// Handle Gradient type
		if (typeof startColor === "object" && startColor !== null && "type" in startColor) {
			if (startColor.type === "Gradient") {
				// For Gradient, extract color from CLinearFunction if available
				const gradientColor = startColor as IQuarksGradientColor;
				if (gradientColor.color?.keys && gradientColor.color.keys.length > 0) {
					const firstKey = gradientColor.color.keys[0];
					const lastKey = gradientColor.color.keys[gradientColor.color.keys.length - 1];
					const color1 = this._extractColorFromGradientKey(firstKey);
					const color2 = this._extractColorFromGradientKey(lastKey);
					return { color1, color2 };
				}
			}
			if (startColor.type === "ColorRange") {
				// For ColorRange, use a and b colors
				const colorRange = startColor as { type: string; a?: { r: number; g: number; b: number; a?: number }; b?: { r: number; g: number; b: number; a?: number } };
				const color1 = this._createColor4FromRGBA(colorRange.a);
				const color2 = this._createColor4FromRGBA(colorRange.b);
				return { color1, color2 };
			}
		}
		// Otherwise treat as IQuarksColor
		return this._convertColorToColor4(startColor as IQuarksColor);
	}

	/**
	 * Extract Color4 from gradient key value
	 */
	private _extractColorFromGradientKey(key: IQuarksGradientKey): Color4 {
		if (Array.isArray(key.value)) {
			return this._createColor4FromArray(key.value as [number, number, number, number]);
		}
		if (typeof key.value === "object" && key.value !== null && "r" in key.value) {
			return this._createColor4FromRGBA(key.value as { r: number; g: number; b: number; a?: number });
		}
		return this._createColor4(1, 1, 1, 1);
	}

	/**
	 * Convert IQuarks color to native Babylon.js Color4 (color1, color2)
	 */
	private _convertColorToColor4(color: IQuarksColor): { color1: Color4; color2: Color4 } {
		if (Array.isArray(color)) {
			const c = this._createColor4FromArray(color as [number, number, number, number]);
			return { color1: c, color2: c };
		}

		if (typeof color === "object" && color !== null && "type" in color) {
			if (color.type === "ConstantColor") {
				const constColor = color as IQuarksConstantColorColor;
				if (constColor.value && Array.isArray(constColor.value)) {
					const c = this._createColor4FromArray(constColor.value);
					return { color1: c, color2: c };
				}
				if (constColor.color) {
					const c = this._createColor4FromRGBA(constColor.color);
					return { color1: c, color2: c };
				}
			}
			// Handle RandomColor (interpolation between two colors)
			const randomColor = color as { type: string; a?: [number, number, number, number]; b?: [number, number, number, number] };
			if (randomColor.type === "RandomColor" && randomColor.a && randomColor.b) {
				const color1 = this._createColor4FromArray(randomColor.a);
				const color2 = this._createColor4FromArray(randomColor.b);
				return { color1, color2 };
			}
		}

		const white = this._createColor4(1, 1, 1, 1);
		return { color1: white, color2: white };
	}

	/**
	 * Convert IQuarks gradient key to  gradient key
	 */
	private _convertGradientKey(key: IQuarksGradientKey): IGradientKey {
		return {
			time: key.time,
			value: key.value,
			pos: key.pos,
		};
	}

	/**
	 * Convert IQuarks shape to  shape
	 */
	private _convertShape(shape: IQuarksShape): IShape {
		const result: IShape = {
			type: shape.type,
			radius: shape.radius,
			arc: shape.arc,
			thickness: shape.thickness,
			angle: shape.angle,
			mode: shape.mode,
			spread: shape.spread,
			size: shape.size,
			height: shape.height,
		};
		if (shape.speed !== undefined) {
			result.speed = this._convertValue(shape.speed);
		}
		return result;
	}

	/**
	 * Convert IQuarks behavior to  behavior
	 */
	private _convertBehavior(behavior: IQuarksBehavior): Behavior {
		switch (behavior.type) {
			case "ColorOverLife":
				return this._convertColorOverLifeBehavior(behavior as IQuarksColorOverLifeBehavior);
			case "SizeOverLife":
				return this._convertSizeOverLifeBehavior(behavior as IQuarksSizeOverLifeBehavior);
			case "RotationOverLife":
			case "Rotation3DOverLife":
				return this._convertRotationOverLifeBehavior(behavior as IQuarksRotationOverLifeBehavior);
			case "ForceOverLife":
			case "ApplyForce":
				return this._convertForceOverLifeBehavior(behavior as IQuarksForceOverLifeBehavior);
			case "GravityForce":
				return this._convertGravityForceBehavior(behavior as IQuarksGravityForceBehavior);
			case "SpeedOverLife":
				return this._convertSpeedOverLifeBehavior(behavior as IQuarksSpeedOverLifeBehavior);
			case "FrameOverLife":
				return this._convertFrameOverLifeBehavior(behavior as IQuarksFrameOverLifeBehavior);
			case "LimitSpeedOverLife":
				return this._convertLimitSpeedOverLifeBehavior(behavior as IQuarksLimitSpeedOverLifeBehavior);
			case "ColorBySpeed":
				return this._convertColorBySpeedBehavior(behavior as IQuarksColorBySpeedBehavior);
			case "SizeBySpeed":
				return this._convertSizeBySpeedBehavior(behavior as IQuarksSizeBySpeedBehavior);
			case "RotationBySpeed":
				return this._convertRotationBySpeedBehavior(behavior as IQuarksRotationBySpeedBehavior);
			case "OrbitOverLife":
				return this._convertOrbitOverLifeBehavior(behavior as IQuarksOrbitOverLifeBehavior);
			default:
				// Fallback for unknown behaviors - copy as-is
				return behavior as Behavior;
		}
	}

	/**
	 * Extract color from ConstantColor behavior
	 */
	private _extractConstantColor(constantColor: IQuarksConstantColorColor): { r: number; g: number; b: number; a: number } {
		if (constantColor.color) {
			return {
				r: constantColor.color.r,
				g: constantColor.color.g,
				b: constantColor.color.b,
				a: constantColor.color.a ?? 1,
			};
		}
		if (constantColor.value && Array.isArray(constantColor.value) && constantColor.value.length >= 4) {
			return {
				r: constantColor.value[0],
				g: constantColor.value[1],
				b: constantColor.value[2],
				a: constantColor.value[3],
			};
		}
		return QuarksConverter.DEFAULT_COLOR;
	}

	/**
	 * Convert ColorOverLife behavior
	 */
	private _convertColorOverLifeBehavior(behavior: IQuarksColorOverLifeBehavior): Behavior {
		if (!behavior.color) {
			return {
				type: "ColorOverLife",
				color: {
					colorFunctionType: "ConstantColor",
					data: {},
				},
			};
		}

		const colorType = behavior.color.type;
		let colorFunction: IColorFunction;

		if (colorType === "Gradient") {
			const gradientColor = behavior.color as IQuarksGradientColor;
			colorFunction = {
				colorFunctionType: "Gradient",
				data: {
					colorKeys: this._convertGradientKeys(gradientColor.color?.keys),
					alphaKeys: this._convertGradientKeys(gradientColor.alpha?.keys),
				},
			};
		} else if (colorType === "ConstantColor") {
			const constantColor = behavior.color as IQuarksConstantColorColor;
			const color = this._extractConstantColor(constantColor);
			colorFunction = {
				colorFunctionType: "ConstantColor",
				data: {
					color: {
						r: color.r ?? 1,
						g: color.g ?? 1,
						b: color.b ?? 1,
						a: color.a !== undefined ? color.a : 1,
					},
				},
			};
		} else if (colorType === "RandomColorBetweenGradient") {
			const randomColor = behavior.color as IQuarksRandomColorBetweenGradient;
			colorFunction = {
				colorFunctionType: "RandomColorBetweenGradient",
				data: {
					gradient1: {
						colorKeys: this._convertGradientKeys(randomColor.gradient1?.color?.keys),
						alphaKeys: this._convertGradientKeys(randomColor.gradient1?.alpha?.keys),
					},
					gradient2: {
						colorKeys: this._convertGradientKeys(randomColor.gradient2?.color?.keys),
						alphaKeys: this._convertGradientKeys(randomColor.gradient2?.alpha?.keys),
					},
				},
			};
		} else {
			// Fallback: try to detect format from keys
			const colorData = behavior.color as { color?: { keys?: IQuarksGradientKey[] }; alpha?: { keys?: IQuarksGradientKey[] }; keys?: IQuarksGradientKey[] };
			const hasColorKeys = colorData.color?.keys && colorData.color.keys.length > 0;
			const hasAlphaKeys = colorData.alpha?.keys && colorData.alpha.keys.length > 0;
			const hasKeys = colorData.keys && colorData.keys.length > 0;

			if (hasColorKeys || hasAlphaKeys || hasKeys) {
				const colorKeys = hasColorKeys ? this._convertGradientKeys(colorData.color?.keys) : hasKeys ? this._convertGradientKeys(colorData.keys) : [];
				const alphaKeys = hasAlphaKeys ? this._convertGradientKeys(colorData.alpha?.keys) : [];
				colorFunction = {
					colorFunctionType: "Gradient",
					data: {
						colorKeys,
						alphaKeys,
					},
				};
			} else {
				// Default to ConstantColor
				colorFunction = {
					colorFunctionType: "ConstantColor",
					data: {},
				};
			}
		}

		return {
			type: "ColorOverLife",
			color: colorFunction,
		};
	}

	/**
	 * Convert SizeOverLife behavior
	 */
	private _convertSizeOverLifeBehavior(behavior: IQuarksSizeOverLifeBehavior): Behavior {
		if (!behavior.size) {
			return { type: "SizeOverLife" };
		}
		return {
			type: "SizeOverLife",
			size: {
				...(behavior.size.keys && { keys: this._convertGradientKeys(behavior.size.keys) }),
				...(behavior.size.functions && { functions: behavior.size.functions }),
			},
		};
	}

	/**
	 * Convert RotationOverLife behavior
	 */
	private _convertRotationOverLifeBehavior(behavior: IQuarksRotationOverLifeBehavior): Behavior {
		return {
			type: behavior.type,
			angularVelocity: this._convertOptionalValue(behavior.angularVelocity),
		};
	}

	/**
	 * Convert ForceOverLife behavior
	 */
	private _convertForceOverLifeBehavior(behavior: IQuarksForceOverLifeBehavior): Behavior {
		const result: IForceOverLifeBehavior = { type: behavior.type };
		if (behavior.force) {
			result.force = {
				x: this._convertOptionalValue(behavior.force.x),
				y: this._convertOptionalValue(behavior.force.y),
				z: this._convertOptionalValue(behavior.force.z),
			};
		}
		result.x = this._convertOptionalValue(behavior.x);
		result.y = this._convertOptionalValue(behavior.y);
		result.z = this._convertOptionalValue(behavior.z);
		return result;
	}

	/**
	 * Convert GravityForce behavior
	 */
	private _convertGravityForceBehavior(behavior: IQuarksGravityForceBehavior): Behavior {
		return {
			type: "GravityForce",
			gravity: this._convertOptionalValue(behavior.gravity),
		} as Behavior;
	}

	/**
	 * Convert SpeedOverLife behavior
	 */
	private _convertSpeedOverLifeBehavior(behavior: IQuarksSpeedOverLifeBehavior): Behavior {
		const speed = this._convertSpeedOrFrameValue(behavior.speed);
		return { type: "SpeedOverLife", ...(speed !== undefined && { speed }) } as ISpeedOverLifeBehavior;
	}

	/**
	 * Convert FrameOverLife behavior
	 */
	private _convertFrameOverLifeBehavior(behavior: IQuarksFrameOverLifeBehavior): Behavior {
		const frame = this._convertSpeedOrFrameValue(behavior.frame);
		return { type: "FrameOverLife", ...(frame !== undefined && { frame }) } as Behavior;
	}

	/**
	 * Convert LimitSpeedOverLife behavior
	 */
	private _convertLimitSpeedOverLifeBehavior(behavior: IQuarksLimitSpeedOverLifeBehavior): Behavior {
		const speed = this._convertSpeedOrFrameValue(behavior.speed);
		return {
			type: "LimitSpeedOverLife",
			maxSpeed: this._convertOptionalValue(behavior.maxSpeed),
			...(speed !== undefined && { speed }),
			dampen: this._convertOptionalValue(behavior.dampen),
		} as ILimitSpeedOverLifeBehavior;
	}

	/**
	 * Convert ColorBySpeed behavior
	 */
	private _convertColorBySpeedBehavior(behavior: IQuarksColorBySpeedBehavior): Behavior {
		const colorFunction: IColorFunction = behavior.color?.keys
			? {
					colorFunctionType: "Gradient",
					data: {
						colorKeys: this._convertGradientKeys(behavior.color.keys),
						alphaKeys: [],
					},
				}
			: {
					colorFunctionType: "ConstantColor",
					data: {},
				};

		return {
			type: "ColorBySpeed",
			color: colorFunction,
			minSpeed: this._convertOptionalValue(behavior.minSpeed),
			maxSpeed: this._convertOptionalValue(behavior.maxSpeed),
		};
	}

	/**
	 * Convert SizeBySpeed behavior
	 */
	private _convertSizeBySpeedBehavior(behavior: IQuarksSizeBySpeedBehavior): Behavior {
		return {
			type: "SizeBySpeed",
			minSpeed: this._convertOptionalValue(behavior.minSpeed),
			maxSpeed: this._convertOptionalValue(behavior.maxSpeed),
			...(behavior.size?.keys && { size: { keys: this._convertGradientKeys(behavior.size.keys) } }),
		} as ISizeBySpeedBehavior;
	}

	/**
	 * Convert RotationBySpeed behavior
	 */
	private _convertRotationBySpeedBehavior(behavior: IQuarksRotationBySpeedBehavior): Behavior {
		return {
			type: "RotationBySpeed",
			angularVelocity: this._convertOptionalValue(behavior.angularVelocity),
			minSpeed: this._convertOptionalValue(behavior.minSpeed),
			maxSpeed: this._convertOptionalValue(behavior.maxSpeed),
		} as Behavior;
	}

	/**
	 * Convert OrbitOverLife behavior
	 */
	private _convertOrbitOverLifeBehavior(behavior: IQuarksOrbitOverLifeBehavior): Behavior {
		return {
			type: "OrbitOverLife",
			center: behavior.center,
			radius: this._convertOptionalValue(behavior.radius),
			speed: this._convertOptionalValue(behavior.speed),
		} as Behavior;
	}

	/**
	 * Convert IQuarks materials to  materials
	 */
	private _convertMaterial(material: IQuarksMaterial): IMaterial {
		const babylonMaterial: IMaterial = {
			uuid: material.uuid,
			type: material.type,
			transparent: material.transparent,
			depthWrite: material.depthWrite,
			side: material.side,
			map: material.map,
		};

		// Convert color from hex to Color3
		if (material.color !== undefined) {
			const colorHex = typeof material.color === "number" ? material.color : parseInt(String(material.color).replace("#", ""), 16) || QuarksConverter.DEFAULT_COLOR_HEX;
			const r = ((colorHex >> 16) & 0xff) / 255;
			const g = ((colorHex >> 8) & 0xff) / 255;
			const b = (colorHex & 0xff) / 255;
			babylonMaterial.color = new Color3(r, g, b);
		}

		// Convert blending mode (Three.js → Babylon.js)
		if (material.blending !== undefined) {
			const blendModeMap: Record<number, number> = {
				0: 0, // NoBlending → ALPHA_DISABLE
				1: 1, // NormalBlending → ALPHA_COMBINE
				2: 2, // AdditiveBlending → ALPHA_ADD
			};
			babylonMaterial.blending = blendModeMap[material.blending] ?? material.blending;
		}

		return babylonMaterial;
	}

	/**
	 * Convert IQuarks textures to  textures
	 */
	private _convertTexture(texture: IQuarksTexture): ITexture {
		const babylonTexture: ITexture = {
			uuid: texture.uuid,
			image: texture.image,
			generateMipmaps: texture.generateMipmaps,
			flipY: texture.flipY,
		};

		// Convert wrap mode (Three.js → Babylon.js)
		if (texture.wrap && Array.isArray(texture.wrap)) {
			const wrapModeMap: Record<number, number> = {
				[QuarksConverter.THREE_REPEAT_WRAPPING]: BabylonTexture.WRAP_ADDRESSMODE,
				[QuarksConverter.THREE_CLAMP_TO_EDGE_WRAPPING]: BabylonTexture.CLAMP_ADDRESSMODE,
				[QuarksConverter.THREE_MIRRORED_REPEAT_WRAPPING]: BabylonTexture.MIRROR_ADDRESSMODE,
			};
			babylonTexture.wrapU = wrapModeMap[texture.wrap[0]] ?? BabylonTexture.WRAP_ADDRESSMODE;
			babylonTexture.wrapV = wrapModeMap[texture.wrap[1]] ?? BabylonTexture.WRAP_ADDRESSMODE;
		}

		// Convert repeat to scale
		if (texture.repeat && Array.isArray(texture.repeat)) {
			babylonTexture.uScale = texture.repeat[0] || 1;
			babylonTexture.vScale = texture.repeat[1] || 1;
		}

		// Convert offset
		if (texture.offset && Array.isArray(texture.offset)) {
			babylonTexture.uOffset = texture.offset[0] || 0;
			babylonTexture.vOffset = texture.offset[1] || 0;
		}

		// Convert rotation
		if (texture.rotation !== undefined) {
			babylonTexture.uAng = texture.rotation;
		}

		// Convert channel
		if (typeof texture.channel === "number") {
			babylonTexture.coordinatesIndex = texture.channel;
		}

		// Convert sampling mode (Three.js filters → Babylon.js sampling mode)
		if (texture.minFilter !== undefined) {
			if (texture.minFilter === QuarksConverter.THREE_LINEAR_MIPMAP_NEAREST_FILTER || texture.minFilter === QuarksConverter.THREE_NEAREST_MIPMAP_LINEAR_FILTER) {
				babylonTexture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
			} else if (texture.minFilter === QuarksConverter.THREE_NEAREST_MIPMAP_NEAREST_FILTER || texture.minFilter === QuarksConverter.THREE_LINEAR_FILTER) {
				babylonTexture.samplingMode = BabylonTexture.BILINEAR_SAMPLINGMODE;
			} else {
				babylonTexture.samplingMode = BabylonTexture.NEAREST_SAMPLINGMODE;
			}
		} else if (texture.magFilter !== undefined) {
			babylonTexture.samplingMode = texture.magFilter === QuarksConverter.THREE_LINEAR_FILTER ? BabylonTexture.BILINEAR_SAMPLINGMODE : BabylonTexture.NEAREST_SAMPLINGMODE;
		} else {
			babylonTexture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
		}

		return babylonTexture;
	}

	/**
	 * Convert IQuarks images to  images (normalize URLs)
	 */
	private _convertImage(image: IQuarksImage): IImage {
		return {
			uuid: image.uuid,
			url: image.url || "",
		};
	}

	/**
	 * Convert IQuarks geometries to  geometries (convert to left-handed)
	 */
	private _convertGeometry(geometry: IQuarksGeometry): IGeometry {
		if (geometry.type === "PlaneGeometry") {
			// PlaneGeometry - simple properties
			const planeGeometry = geometry as IQuarksGeometry & { width?: number; height?: number };
			return {
				uuid: geometry.uuid,
				type: "PlaneGeometry" as const,
				width: planeGeometry.width ?? 1,
				height: planeGeometry.height ?? 1,
			};
		} else if (geometry.type === "BufferGeometry") {
			// BufferGeometry - convert attributes to left-handed
			const result: IGeometry = {
				uuid: geometry.uuid,
				type: "BufferGeometry",
			};

			if (geometry.data?.attributes) {
				const attributes: IGeometryData["attributes"] = {};
				const sourceAttrs = geometry.data.attributes;

				// Convert position and normal (right-hand → left-hand: flip Z)
				const positionAttr = this._convertAttribute(sourceAttrs.position, true);
				if (positionAttr) {
					attributes.position = positionAttr;
				}

				const normalAttr = this._convertAttribute(sourceAttrs.normal, true);
				if (normalAttr) {
					attributes.normal = normalAttr;
				}

				// UV and color - no conversion needed
				const uvAttr = this._convertAttribute(sourceAttrs.uv, false);
				if (uvAttr) {
					attributes.uv = uvAttr;
				}

				const colorAttr = this._convertAttribute(sourceAttrs.color, false);
				if (colorAttr) {
					attributes.color = colorAttr;
				}

				result.data = {
					attributes,
				};

				// Convert indices (reverse winding order for left-handed)
				if (geometry.data.index) {
					const indices = Array.from(geometry.data.index.array);
					// Reverse winding: swap every 2nd and 3rd index in each triangle
					for (let i = 0; i < indices.length; i += 3) {
						const temp = indices[i + 1];
						indices[i + 1] = indices[i + 2];
						indices[i + 2] = temp;
					}
					result.data.index = {
						array: indices,
					};
				}
			}

			return result;
		}

		// Unknown geometry type - return as-is
		return {
			uuid: geometry.uuid,
			type: geometry.type as "PlaneGeometry" | "BufferGeometry",
		};
	}
}
