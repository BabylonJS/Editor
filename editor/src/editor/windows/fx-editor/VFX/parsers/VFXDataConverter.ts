import { Vector3, Matrix, Quaternion } from "babylonjs";
import type { VFXLoaderOptions } from "../types/loader";
import type { QuarksVFXJSON } from "../types/quarksTypes";
import type {
	QuarksObject,
	QuarksParticleEmitterConfig,
	QuarksBehavior,
	QuarksValue,
	QuarksColor,
	QuarksRotation,
	QuarksGradientKey,
	QuarksShape,
	QuarksColorOverLifeBehavior,
	QuarksSizeOverLifeBehavior,
	QuarksRotationOverLifeBehavior,
	QuarksForceOverLifeBehavior,
	QuarksGravityForceBehavior,
	QuarksSpeedOverLifeBehavior,
	QuarksFrameOverLifeBehavior,
	QuarksLimitSpeedOverLifeBehavior,
	QuarksColorBySpeedBehavior,
	QuarksSizeBySpeedBehavior,
	QuarksRotationBySpeedBehavior,
	QuarksOrbitOverLifeBehavior,
} from "../types/quarksTypes";
import type { VFXTransform, VFXGroup, VFXEmitter, VFXData } from "../types/hierarchy";
import type { VFXParticleEmitterConfig } from "../types/emitterConfig";
import type {
	VFXBehavior,
	VFXColorOverLifeBehavior,
	VFXSizeOverLifeBehavior,
	VFXForceOverLifeBehavior,
	VFXSpeedOverLifeBehavior,
	VFXLimitSpeedOverLifeBehavior,
	VFXColorBySpeedBehavior,
	VFXSizeBySpeedBehavior,
} from "../types/behaviors";
import type { VFXValue } from "../types/values";
import type { VFXColor } from "../types/colors";
import type { VFXRotation } from "../types/rotations";
import type { VFXGradientKey } from "../types/gradients";
import type { VFXShape } from "../types/shapes";
import { VFXLogger } from "../loggers/VFXLogger";

/**
 * Converts Quarks/Three.js VFX JSON (right-handed) to Babylon.js VFX format (left-handed)
 * All coordinate system conversions happen here, once
 */
export class VFXDataConverter {
	private _logger: VFXLogger;
	private _options?: VFXLoaderOptions;

	constructor(options?: VFXLoaderOptions) {
		this._logger = new VFXLogger("[VFXDataConverter]");
		this._options = options;
	}

	/**
	 * Convert Quarks/Three.js VFX JSON to Babylon.js VFX format
	 */
	public convert(quarksVFXData: QuarksVFXJSON): VFXData {
		this._logger.log("=== Converting Quarks VFX to Babylon.js VFX format ===", this._options);

		const groups = new Map<string, VFXGroup>();
		const emitters = new Map<string, VFXEmitter>();

		let root: VFXGroup | VFXEmitter | null = null;

		if (quarksVFXData.object) {
			root = this._convertObject(quarksVFXData.object, null, groups, emitters, 0);
		}

		this._logger.log(`=== Conversion complete. Groups: ${groups.size}, Emitters: ${emitters.size} ===`, this._options);

		return {
			root,
			groups,
			emitters,
		};
	}

	/**
	 * Convert a Quarks/Three.js object to Babylon.js VFX format
	 */
	private _convertObject(
		obj: QuarksObject,
		parentUuid: string | null,
		groups: Map<string, VFXGroup>,
		emitters: Map<string, VFXEmitter>,
		depth: number
	): VFXGroup | VFXEmitter | null {
		const indent = "  ".repeat(depth);
		const options = this._options;

		if (!obj || typeof obj !== "object") {
			return null;
		}

		this._logger.log(`${indent}Converting object: ${obj.type || "unknown"} (name: ${obj.name || "unnamed"})`, options);

		// Convert transform from right-handed to left-handed
		const transform = this._convertTransform(obj.matrix, obj.position, obj.rotation, obj.scale, options);

		if (obj.type === "Group") {
			const group: VFXGroup = {
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
							group.children.push(convertedChild as VFXEmitter);
						} else {
							// It's a group
							group.children.push(convertedChild as VFXGroup);
						}
					}
				}
			}

			groups.set(group.uuid, group);
			this._logger.log(`${indent}Converted Group: ${group.name} (uuid: ${group.uuid})`, options);
			return group;
		} else if (obj.type === "ParticleEmitter" && obj.ps) {
			// Convert emitter config from Quarks to VFX format
			const vfxConfig = this._convertEmitterConfig(obj.ps);

			// Determine system type based on renderMode: 2 = solid, otherwise base
			const systemType: "solid" | "base" = vfxConfig.renderMode === 2 ? "solid" : "base";

			const emitter: VFXEmitter = {
				uuid: obj.uuid || `emitter_${emitters.size}`,
				name: obj.name || "ParticleEmitter",
				transform,
				config: vfxConfig,
				materialId: obj.ps.material,
				parentUuid: parentUuid || undefined,
				systemType,
			};

			emitters.set(emitter.uuid, emitter);
			this._logger.log(`${indent}Converted Emitter: ${emitter.name} (uuid: ${emitter.uuid}, systemType: ${systemType})`, options);
			return emitter;
		}

		return null;
	}

	/**
	 * Convert transform from Quarks/Three.js (right-handed) to Babylon.js VFX (left-handed)
	 * This is the ONLY place where handedness conversion happens
	 */
	private _convertTransform(matrixArray?: number[], positionArray?: number[], rotationArray?: number[], scaleArray?: number[], _options?: VFXLoaderOptions): VFXTransform {
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
	 * Convert emitter config from Quarks to VFX format
	 */
	private _convertEmitterConfig(quarksConfig: QuarksParticleEmitterConfig): VFXParticleEmitterConfig {
		const vfxConfig: VFXParticleEmitterConfig = {
			version: quarksConfig.version,
			autoDestroy: quarksConfig.autoDestroy,
			looping: quarksConfig.looping,
			prewarm: quarksConfig.prewarm,
			duration: quarksConfig.duration,
			onlyUsedByOther: quarksConfig.onlyUsedByOther,
			instancingGeometry: quarksConfig.instancingGeometry,
			renderOrder: quarksConfig.renderOrder,
			renderMode: quarksConfig.renderMode,
			rendererEmitterSettings: quarksConfig.rendererEmitterSettings,
			material: quarksConfig.material,
			layers: quarksConfig.layers,
			uTileCount: quarksConfig.uTileCount,
			vTileCount: quarksConfig.vTileCount,
			blendTiles: quarksConfig.blendTiles,
			softParticles: quarksConfig.softParticles,
			softFarFade: quarksConfig.softFarFade,
			softNearFade: quarksConfig.softNearFade,
			worldSpace: quarksConfig.worldSpace,
		};

		// Convert values
		if (quarksConfig.startLife !== undefined) {
			vfxConfig.startLife = this._convertValue(quarksConfig.startLife);
		}
		if (quarksConfig.startSpeed !== undefined) {
			vfxConfig.startSpeed = this._convertValue(quarksConfig.startSpeed);
		}
		if (quarksConfig.startRotation !== undefined) {
			vfxConfig.startRotation = this._convertRotation(quarksConfig.startRotation);
		}
		if (quarksConfig.startSize !== undefined) {
			vfxConfig.startSize = this._convertValue(quarksConfig.startSize);
		}
		if (quarksConfig.startColor !== undefined) {
			vfxConfig.startColor = this._convertColor(quarksConfig.startColor);
		}
		if (quarksConfig.emissionOverTime !== undefined) {
			vfxConfig.emissionOverTime = this._convertValue(quarksConfig.emissionOverTime);
		}
		if (quarksConfig.emissionOverDistance !== undefined) {
			vfxConfig.emissionOverDistance = this._convertValue(quarksConfig.emissionOverDistance);
		}
		if (quarksConfig.startTileIndex !== undefined) {
			vfxConfig.startTileIndex = this._convertValue(quarksConfig.startTileIndex);
		}

		// Convert shape
		if (quarksConfig.shape !== undefined) {
			vfxConfig.shape = this._convertShape(quarksConfig.shape);
		}

		// Convert emission bursts
		if (quarksConfig.emissionBursts !== undefined && Array.isArray(quarksConfig.emissionBursts)) {
			vfxConfig.emissionBursts = quarksConfig.emissionBursts.map((burst) => ({
				time: this._convertValue(burst.time),
				count: this._convertValue(burst.count),
			}));
		}

		// Convert behaviors
		if (quarksConfig.behaviors !== undefined && Array.isArray(quarksConfig.behaviors)) {
			vfxConfig.behaviors = quarksConfig.behaviors.map((behavior) => this._convertBehavior(behavior));
		}

		return vfxConfig;
	}

	/**
	 * Convert Quarks value to VFX value
	 */
	private _convertValue(quarksValue: QuarksValue): VFXValue {
		if (typeof quarksValue === "number") {
			return quarksValue;
		}
		if (quarksValue.type === "ConstantValue") {
			return {
				type: "ConstantValue",
				value: quarksValue.value,
			};
		}
		if (quarksValue.type === "IntervalValue") {
			return {
				type: "IntervalValue",
				min: quarksValue.a ?? 0,
				max: quarksValue.b ?? 0,
			};
		}
		if (quarksValue.type === "PiecewiseBezier") {
			return {
				type: "PiecewiseBezier",
				functions: quarksValue.functions.map((f) => ({
					function: f.function,
					start: f.start,
				})),
			};
		}
		return quarksValue;
	}

	/**
	 * Convert Quarks color to VFX color
	 */
	private _convertColor(quarksColor: QuarksColor): VFXColor {
		if (typeof quarksColor === "string" || Array.isArray(quarksColor)) {
			return quarksColor;
		}
		if (quarksColor.type === "ConstantColor") {
			if (quarksColor.value && Array.isArray(quarksColor.value)) {
				return {
					type: "ConstantColor",
					value: quarksColor.value,
				};
			} else if (quarksColor.color) {
				return {
					type: "ConstantColor",
					value: [quarksColor.color.r || 0, quarksColor.color.g || 0, quarksColor.color.b || 0, quarksColor.color.a !== undefined ? quarksColor.color.a : 1],
				};
			} else {
				// Fallback: return default color if neither value nor color is present
				return {
					type: "ConstantColor",
					value: [1, 1, 1, 1],
				};
			}
		}
		return quarksColor as VFXColor;
	}

	/**
	 * Convert Quarks rotation to VFX rotation
	 */
	private _convertRotation(quarksRotation: QuarksRotation): VFXRotation {
		if (typeof quarksRotation === "number" || (typeof quarksRotation === "object" && quarksRotation !== null && "type" in quarksRotation && quarksRotation.type !== "Euler")) {
			return this._convertValue(quarksRotation as QuarksValue);
		}
		if (typeof quarksRotation === "object" && quarksRotation !== null && "type" in quarksRotation && quarksRotation.type === "Euler") {
			return {
				type: "Euler",
				angleX: quarksRotation.angleX !== undefined ? this._convertValue(quarksRotation.angleX) : undefined,
				angleY: quarksRotation.angleY !== undefined ? this._convertValue(quarksRotation.angleY) : undefined,
				angleZ: quarksRotation.angleZ !== undefined ? this._convertValue(quarksRotation.angleZ) : undefined,
			};
		}
		return this._convertValue(quarksRotation as QuarksValue);
	}

	/**
	 * Convert Quarks gradient key to VFX gradient key
	 */
	private _convertGradientKey(quarksKey: QuarksGradientKey): VFXGradientKey {
		return {
			time: quarksKey.time,
			value: quarksKey.value,
			pos: quarksKey.pos,
		};
	}

	/**
	 * Convert Quarks shape to VFX shape
	 */
	private _convertShape(quarksShape: QuarksShape): VFXShape {
		const vfxShape: VFXShape = {
			type: quarksShape.type,
			radius: quarksShape.radius,
			arc: quarksShape.arc,
			thickness: quarksShape.thickness,
			angle: quarksShape.angle,
			mode: quarksShape.mode,
			spread: quarksShape.spread,
			size: quarksShape.size,
			height: quarksShape.height,
		};
		if (quarksShape.speed !== undefined) {
			vfxShape.speed = this._convertValue(quarksShape.speed);
		}
		return vfxShape;
	}

	/**
	 * Convert Quarks behavior to VFX behavior
	 */
	private _convertBehavior(quarksBehavior: QuarksBehavior): VFXBehavior {
		switch (quarksBehavior.type) {
			case "ColorOverLife": {
				const behavior = quarksBehavior as QuarksColorOverLifeBehavior;
				if (behavior.color) {
					const vfxColor: VFXColorOverLifeBehavior["color"] = {};
					if (behavior.color.color?.keys) {
						vfxColor.color = { keys: behavior.color.color.keys.map((k) => this._convertGradientKey(k)) };
					}
					if (behavior.color.alpha?.keys) {
						vfxColor.alpha = { keys: behavior.color.alpha.keys.map((k) => this._convertGradientKey(k)) };
					}
					if (behavior.color.keys) {
						vfxColor.keys = behavior.color.keys.map((k) => this._convertGradientKey(k));
					}
					return { type: "ColorOverLife", color: vfxColor };
				}
				return { type: "ColorOverLife" };
			}

			case "SizeOverLife": {
				const behavior = quarksBehavior as QuarksSizeOverLifeBehavior;
				if (behavior.size) {
					const vfxSize: VFXSizeOverLifeBehavior["size"] = {};
					if (behavior.size.keys) {
						vfxSize.keys = behavior.size.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k));
					}
					if (behavior.size.functions) {
						vfxSize.functions = behavior.size.functions;
					}
					return { type: "SizeOverLife", size: vfxSize };
				}
				return { type: "SizeOverLife" };
			}

			case "RotationOverLife":
			case "Rotation3DOverLife": {
				const behavior = quarksBehavior as QuarksRotationOverLifeBehavior;
				return {
					type: behavior.type,
					angularVelocity: behavior.angularVelocity !== undefined ? this._convertValue(behavior.angularVelocity) : undefined,
				};
			}

			case "ForceOverLife":
			case "ApplyForce": {
				const behavior = quarksBehavior as QuarksForceOverLifeBehavior;
				const vfxBehavior: VFXForceOverLifeBehavior = { type: behavior.type };
				if (behavior.force) {
					vfxBehavior.force = {
						x: behavior.force.x !== undefined ? this._convertValue(behavior.force.x) : undefined,
						y: behavior.force.y !== undefined ? this._convertValue(behavior.force.y) : undefined,
						z: behavior.force.z !== undefined ? this._convertValue(behavior.force.z) : undefined,
					};
				}
				if (behavior.x !== undefined) vfxBehavior.x = this._convertValue(behavior.x);
				if (behavior.y !== undefined) vfxBehavior.y = this._convertValue(behavior.y);
				if (behavior.z !== undefined) vfxBehavior.z = this._convertValue(behavior.z);
				return vfxBehavior;
			}

			case "GravityForce": {
				const behavior = quarksBehavior as QuarksGravityForceBehavior;
				const vfxBehavior: { type: string; gravity?: VFXValue } = {
					type: "GravityForce",
					gravity: behavior.gravity !== undefined ? this._convertValue(behavior.gravity) : undefined,
				};
				return vfxBehavior as VFXBehavior;
			}

			case "SpeedOverLife": {
				const behavior = quarksBehavior as QuarksSpeedOverLifeBehavior;
				if (behavior.speed) {
					if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed) {
						const vfxSpeed: VFXSpeedOverLifeBehavior["speed"] = {};
						if (behavior.speed.keys) {
							vfxSpeed.keys = behavior.speed.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k));
						}
						if (behavior.speed.functions) {
							vfxSpeed.functions = behavior.speed.functions;
						}
						return { type: "SpeedOverLife", speed: vfxSpeed };
					} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
						return { type: "SpeedOverLife", speed: this._convertValue(behavior.speed as QuarksValue) };
					}
				}
				return { type: "SpeedOverLife" };
			}

			case "FrameOverLife": {
				const behavior = quarksBehavior as QuarksFrameOverLifeBehavior;
				const vfxBehavior: { type: string; frame?: VFXValue | { keys?: VFXGradientKey[] } } = { type: "FrameOverLife" };
				if (behavior.frame) {
					if (typeof behavior.frame === "object" && behavior.frame !== null && "keys" in behavior.frame) {
						vfxBehavior.frame = {
							keys: behavior.frame.keys?.map((k: QuarksGradientKey) => this._convertGradientKey(k)),
						};
					} else if (typeof behavior.frame === "number" || (typeof behavior.frame === "object" && behavior.frame !== null && "type" in behavior.frame)) {
						vfxBehavior.frame = this._convertValue(behavior.frame as QuarksValue);
					}
				}
				return vfxBehavior as VFXBehavior;
			}

			case "LimitSpeedOverLife": {
				const behavior = quarksBehavior as QuarksLimitSpeedOverLifeBehavior;
				const vfxBehavior: VFXLimitSpeedOverLifeBehavior = { type: "LimitSpeedOverLife" };
				if (behavior.maxSpeed !== undefined) {
					vfxBehavior.maxSpeed = this._convertValue(behavior.maxSpeed);
				}
				if (behavior.speed !== undefined) {
					if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed) {
						vfxBehavior.speed = { keys: behavior.speed.keys?.map((k: QuarksGradientKey) => this._convertGradientKey(k)) };
					} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
						vfxBehavior.speed = this._convertValue(behavior.speed as QuarksValue);
					}
				}
				if (behavior.dampen !== undefined) {
					vfxBehavior.dampen = this._convertValue(behavior.dampen);
				}
				return vfxBehavior;
			}

			case "ColorBySpeed": {
				const behavior = quarksBehavior as QuarksColorBySpeedBehavior;
				const vfxBehavior: VFXColorBySpeedBehavior = {
					type: "ColorBySpeed",
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				if (behavior.color?.keys) {
					vfxBehavior.color = { keys: behavior.color.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k)) };
				}
				return vfxBehavior;
			}

			case "SizeBySpeed": {
				const behavior = quarksBehavior as QuarksSizeBySpeedBehavior;
				const vfxBehavior: VFXSizeBySpeedBehavior = {
					type: "SizeBySpeed",
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				if (behavior.size?.keys) {
					vfxBehavior.size = { keys: behavior.size.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k)) };
				}
				return vfxBehavior;
			}

			case "RotationBySpeed": {
				const behavior = quarksBehavior as QuarksRotationBySpeedBehavior;
				const vfxBehavior: { type: string; angularVelocity?: VFXValue; minSpeed?: VFXValue; maxSpeed?: VFXValue } = {
					type: "RotationBySpeed",
					angularVelocity: behavior.angularVelocity !== undefined ? this._convertValue(behavior.angularVelocity) : undefined,
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				return vfxBehavior as VFXBehavior;
			}

			case "OrbitOverLife": {
				const behavior = quarksBehavior as QuarksOrbitOverLifeBehavior;
				const vfxBehavior: { type: string; center?: { x?: number; y?: number; z?: number }; radius?: VFXValue; speed?: VFXValue } = {
					type: "OrbitOverLife",
					center: behavior.center,
					radius: behavior.radius !== undefined ? this._convertValue(behavior.radius) : undefined,
					speed: behavior.speed !== undefined ? this._convertValue(behavior.speed) : undefined,
				};
				return vfxBehavior as VFXBehavior;
			}

			default:
				// Fallback for unknown behaviors - copy as-is
				return quarksBehavior as VFXBehavior;
		}
	}
}
