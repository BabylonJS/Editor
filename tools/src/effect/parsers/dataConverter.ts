import { Vector3, Matrix, Quaternion, Color3, Texture as BabylonTexture, ParticleSystem } from "babylonjs";
import type { LoaderOptions } from "../types/loader";
import type { QuarksJSON, QuarksMaterial, QuarksTexture, QuarksImage, QuarksGeometry } from "../types/quarksTypes";
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
import type { Transform, Group, Emitter, Data } from "../types/hierarchy";
import type { Material, Texture, Image, Geometry, GeometryData } from "../types/resources";
import type { EmitterConfig } from "../types/emitter";
import type {
	Behavior,
	ColorOverLifeBehavior,
	SizeOverLifeBehavior,
	ForceOverLifeBehavior,
	SpeedOverLifeBehavior,
	LimitSpeedOverLifeBehavior,
	ColorBySpeedBehavior,
	SizeBySpeedBehavior,
} from "../types/behaviors";
import type { Value } from "../types/values";
import type { Color } from "../types/colors";
import type { Rotation } from "../types/rotations";
import type { GradientKey } from "../types/gradients";
import type { Shape } from "../types/shapes";
import { Logger } from "../loggers/logger";

/**
 * Converts Quarks/Three.js  JSON (right-handed) to Babylon.js  format (left-handed)
 * All coordinate system conversions happen here, once
 */
export class DataConverter {
	private _logger: Logger;

	constructor(options?: LoaderOptions) {
		this._logger = new Logger("[DataConverter]", options);
	}

	/**
	 * Convert Quarks/Three.js  JSON to Babylon.js  format
	 * Handles errors gracefully and returns partial data if conversion fails
	 */
	public convert(quarksData: QuarksJSON): Data {
		this._logger.log("=== Converting Quarks  to Babylon.js  format ===");

		const groups = new Map<string, Group>();
		const emitters = new Map<string, Emitter>();

		let root: Group | Emitter | null = null;

		try {
			if (quarksData.object) {
				root = this._convertObject(quarksData.object, null, groups, emitters, 0);
			}
		} catch (error) {
			this._logger.error(`Failed to convert root object: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Convert all resources with error handling
		let materials: Material[] = [];
		let textures: Texture[] = [];
		let images: Image[] = [];
		let geometries: Geometry[] = [];

		try {
			materials = this._convertMaterials(quarksData.materials || []);
		} catch (error) {
			this._logger.error(`Failed to convert materials: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			textures = this._convertTextures(quarksData.textures || []);
		} catch (error) {
			this._logger.error(`Failed to convert textures: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			images = this._convertImages(quarksData.images || []);
		} catch (error) {
			this._logger.error(`Failed to convert images: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			geometries = this._convertGeometries(quarksData.geometries || []);
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
	 * Convert a Quarks/Three.js object to Babylon.js  format
	 */
	private _convertObject(obj: QuarksObject, parentUuid: string | null, groups: Map<string, Group>, emitters: Map<string, Emitter>, depth: number): Group | Emitter | null {
		const indent = "  ".repeat(depth);

		if (!obj || typeof obj !== "object") {
			return null;
		}

		this._logger.log(`${indent}Converting object: ${obj.type || "unknown"} (name: ${obj.name || "unnamed"})`);

		// Convert transform from right-handed to left-handed
		const transform = this._convertTransform(obj.matrix, obj.position, obj.rotation, obj.scale);

		if (obj.type === "Group") {
			const group: Group = {
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
							group.children.push(convertedChild as Emitter);
						} else {
							// It's a group
							group.children.push(convertedChild as Group);
						}
					}
				}
			}

			groups.set(group.uuid, group);
			this._logger.log(`${indent}Converted Group: ${group.name} (uuid: ${group.uuid})`);
			return group;
		} else if (obj.type === "ParticleEmitter" && obj.ps) {
			// Convert emitter config from Quarks to  format
			const Config = this._convertEmitterConfig(obj.ps);

			const emitter: Emitter = {
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
	 * Convert transform from Quarks/Three.js (right-handed) to Babylon.js  (left-handed)
	 * This is the ONLY place where handedness conversion happens
	 */
	private _convertTransform(matrixArray?: number[], positionArray?: number[], rotationArray?: number[], scaleArray?: number[]): Transform {
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
	 * Convert emitter config from Quarks to  format
	 */
	private _convertEmitterConfig(quarksConfig: QuarksParticleEmitterConfig): EmitterConfig {
		// Determine system type based on renderMode: 2 = solid, otherwise base
		const systemType: "solid" | "base" = quarksConfig.renderMode === 2 ? "solid" : "base";

		const Config: EmitterConfig = {
			version: quarksConfig.version,
			autoDestroy: quarksConfig.autoDestroy,
			looping: quarksConfig.looping,
			prewarm: quarksConfig.prewarm,
			duration: quarksConfig.duration,
			onlyUsedByOther: quarksConfig.onlyUsedByOther,
			instancingGeometry: quarksConfig.instancingGeometry,
			renderOrder: quarksConfig.renderOrder,
			systemType,
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
			Config.startLife = this._convertValue(quarksConfig.startLife);
		}
		if (quarksConfig.startSpeed !== undefined) {
			Config.startSpeed = this._convertValue(quarksConfig.startSpeed);
		}
		if (quarksConfig.startRotation !== undefined) {
			Config.startRotation = this._convertRotation(quarksConfig.startRotation);
		}
		if (quarksConfig.startSize !== undefined) {
			Config.startSize = this._convertValue(quarksConfig.startSize);
		}
		if (quarksConfig.startColor !== undefined) {
			Config.startColor = this._convertColor(quarksConfig.startColor);
		}
		if (quarksConfig.emissionOverTime !== undefined) {
			Config.emissionOverTime = this._convertValue(quarksConfig.emissionOverTime);
		}
		if (quarksConfig.emissionOverDistance !== undefined) {
			Config.emissionOverDistance = this._convertValue(quarksConfig.emissionOverDistance);
		}
		if (quarksConfig.startTileIndex !== undefined) {
			Config.startTileIndex = this._convertValue(quarksConfig.startTileIndex);
		}

		// Convert shape
		if (quarksConfig.shape !== undefined) {
			Config.shape = this._convertShape(quarksConfig.shape);
		}

		// Convert emission bursts
		if (quarksConfig.emissionBursts !== undefined && Array.isArray(quarksConfig.emissionBursts)) {
			Config.emissionBursts = quarksConfig.emissionBursts.map((burst) => ({
				time: this._convertValue(burst.time),
				count: this._convertValue(burst.count),
			}));
		}

		// Convert behaviors
		if (quarksConfig.behaviors !== undefined && Array.isArray(quarksConfig.behaviors)) {
			Config.behaviors = quarksConfig.behaviors.map((behavior) => this._convertBehavior(behavior));
		}

		// Convert renderMode to systemType, billboardMode and isBillboardBased
		// Quarks RenderMode:
		// 0 = BillBoard → systemType = "base", isBillboardBased = true, billboardMode = ALL (default)
		// 1 = StretchedBillBoard → systemType = "base", isBillboardBased = true, billboardMode = STRETCHED
		// 2 = Mesh → systemType = "solid", isBillboardBased = false (always)
		// 3 = Trail → systemType = "base", isBillboardBased = true, billboardMode = ALL (not directly supported, treat as billboard)
		// 4 = HorizontalBillBoard → systemType = "base", isBillboardBased = true, billboardMode = Y
		// 5 = VerticalBillBoard → systemType = "base", isBillboardBased = true, billboardMode = Y (same as horizontal)
		if (quarksConfig.renderMode !== undefined) {
			if (quarksConfig.renderMode === 0) {
				// BillBoard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
			} else if (quarksConfig.renderMode === 1) {
				// StretchedBillBoard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
			} else if (quarksConfig.renderMode === 2) {
				// Mesh (SolidParticleSystem) - always false
				Config.isBillboardBased = false;
				// billboardMode not applicable for mesh
			} else if (quarksConfig.renderMode === 3) {
				// Trail - not directly supported, treat as billboard
				Config.isBillboardBased = true;
				Config.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
			} else if (quarksConfig.renderMode === 4 || quarksConfig.renderMode === 5) {
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
	 * Convert Quarks value to  value
	 */
	private _convertValue(quarksValue: QuarksValue): Value {
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
	 * Convert Quarks color to  color
	 */
	private _convertColor(quarksColor: QuarksColor): Color {
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
		return quarksColor as Color;
	}

	/**
	 * Convert Quarks rotation to  rotation
	 */
	private _convertRotation(quarksRotation: QuarksRotation): Rotation {
		if (typeof quarksRotation === "number" || (typeof quarksRotation === "object" && quarksRotation !== null && "type" in quarksRotation && quarksRotation.type !== "Euler")) {
			return this._convertValue(quarksRotation as QuarksValue);
		}
		if (typeof quarksRotation === "object" && quarksRotation !== null && "type" in quarksRotation && quarksRotation.type === "Euler") {
			return {
				type: "Euler",
				angleX: quarksRotation.angleX !== undefined ? this._convertValue(quarksRotation.angleX) : undefined,
				angleY: quarksRotation.angleY !== undefined ? this._convertValue(quarksRotation.angleY) : undefined,
				angleZ: quarksRotation.angleZ !== undefined ? this._convertValue(quarksRotation.angleZ) : undefined,
				order: (quarksRotation as any).order || "xyz", // Default to xyz if not specified
			};
		}
		return this._convertValue(quarksRotation as QuarksValue);
	}

	/**
	 * Convert Quarks gradient key to  gradient key
	 */
	private _convertGradientKey(quarksKey: QuarksGradientKey): GradientKey {
		return {
			time: quarksKey.time,
			value: quarksKey.value,
			pos: quarksKey.pos,
		};
	}

	/**
	 * Convert Quarks shape to  shape
	 */
	private _convertShape(quarksShape: QuarksShape): Shape {
		const Shape: Shape = {
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
			Shape.speed = this._convertValue(quarksShape.speed);
		}
		return Shape;
	}

	/**
	 * Convert Quarks behavior to  behavior
	 */
	private _convertBehavior(quarksBehavior: QuarksBehavior): Behavior {
		switch (quarksBehavior.type) {
			case "ColorOverLife": {
				const behavior = quarksBehavior as QuarksColorOverLifeBehavior;
				if (behavior.color) {
					const Color: ColorOverLifeBehavior["color"] = {};
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
				const behavior = quarksBehavior as QuarksSizeOverLifeBehavior;
				if (behavior.size) {
					const Size: SizeOverLifeBehavior["size"] = {};
					if (behavior.size.keys) {
						Size.keys = behavior.size.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k));
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
				const behavior = quarksBehavior as QuarksRotationOverLifeBehavior;
				return {
					type: behavior.type,
					angularVelocity: behavior.angularVelocity !== undefined ? this._convertValue(behavior.angularVelocity) : undefined,
				};
			}

			case "ForceOverLife":
			case "ApplyForce": {
				const behavior = quarksBehavior as QuarksForceOverLifeBehavior;
				const Behavior: ForceOverLifeBehavior = { type: behavior.type };
				if (behavior.force) {
					Behavior.force = {
						x: behavior.force.x !== undefined ? this._convertValue(behavior.force.x) : undefined,
						y: behavior.force.y !== undefined ? this._convertValue(behavior.force.y) : undefined,
						z: behavior.force.z !== undefined ? this._convertValue(behavior.force.z) : undefined,
					};
				}
				if (behavior.x !== undefined) Behavior.x = this._convertValue(behavior.x);
				if (behavior.y !== undefined) Behavior.y = this._convertValue(behavior.y);
				if (behavior.z !== undefined) Behavior.z = this._convertValue(behavior.z);
				return Behavior;
			}

			case "GravityForce": {
				const behavior = quarksBehavior as QuarksGravityForceBehavior;
				const Behavior: { type: string; gravity?: Value } = {
					type: "GravityForce",
					gravity: behavior.gravity !== undefined ? this._convertValue(behavior.gravity) : undefined,
				};
				return Behavior as Behavior;
			}

			case "SpeedOverLife": {
				const behavior = quarksBehavior as QuarksSpeedOverLifeBehavior;
				if (behavior.speed) {
					if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed) {
						const Speed: SpeedOverLifeBehavior["speed"] = {};
						if (behavior.speed.keys) {
							Speed.keys = behavior.speed.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k));
						}
						if (behavior.speed.functions) {
							Speed.functions = behavior.speed.functions;
						}
						return { type: "SpeedOverLife", speed: Speed };
					} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
						return { type: "SpeedOverLife", speed: this._convertValue(behavior.speed as QuarksValue) };
					}
				}
				return { type: "SpeedOverLife" };
			}

			case "FrameOverLife": {
				const behavior = quarksBehavior as QuarksFrameOverLifeBehavior;
				const Behavior: { type: string; frame?: Value | { keys?: GradientKey[] } } = { type: "FrameOverLife" };
				if (behavior.frame) {
					if (typeof behavior.frame === "object" && behavior.frame !== null && "keys" in behavior.frame) {
						Behavior.frame = {
							keys: behavior.frame.keys?.map((k: QuarksGradientKey) => this._convertGradientKey(k)),
						};
					} else if (typeof behavior.frame === "number" || (typeof behavior.frame === "object" && behavior.frame !== null && "type" in behavior.frame)) {
						Behavior.frame = this._convertValue(behavior.frame as QuarksValue);
					}
				}
				return Behavior as Behavior;
			}

			case "LimitSpeedOverLife": {
				const behavior = quarksBehavior as QuarksLimitSpeedOverLifeBehavior;
				const Behavior: LimitSpeedOverLifeBehavior = { type: "LimitSpeedOverLife" };
				if (behavior.maxSpeed !== undefined) {
					Behavior.maxSpeed = this._convertValue(behavior.maxSpeed);
				}
				if (behavior.speed !== undefined) {
					if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed) {
						Behavior.speed = { keys: behavior.speed.keys?.map((k: QuarksGradientKey) => this._convertGradientKey(k)) };
					} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
						Behavior.speed = this._convertValue(behavior.speed as QuarksValue);
					}
				}
				if (behavior.dampen !== undefined) {
					Behavior.dampen = this._convertValue(behavior.dampen);
				}
				return Behavior;
			}

			case "ColorBySpeed": {
				const behavior = quarksBehavior as QuarksColorBySpeedBehavior;
				const Behavior: ColorBySpeedBehavior = {
					type: "ColorBySpeed",
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				if (behavior.color?.keys) {
					Behavior.color = { keys: behavior.color.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k)) };
				}
				return Behavior;
			}

			case "SizeBySpeed": {
				const behavior = quarksBehavior as QuarksSizeBySpeedBehavior;
				const Behavior: SizeBySpeedBehavior = {
					type: "SizeBySpeed",
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				if (behavior.size?.keys) {
					Behavior.size = { keys: behavior.size.keys.map((k: QuarksGradientKey) => this._convertGradientKey(k)) };
				}
				return Behavior;
			}

			case "RotationBySpeed": {
				const behavior = quarksBehavior as QuarksRotationBySpeedBehavior;
				const Behavior: { type: string; angularVelocity?: Value; minSpeed?: Value; maxSpeed?: Value } = {
					type: "RotationBySpeed",
					angularVelocity: behavior.angularVelocity !== undefined ? this._convertValue(behavior.angularVelocity) : undefined,
					minSpeed: behavior.minSpeed !== undefined ? this._convertValue(behavior.minSpeed) : undefined,
					maxSpeed: behavior.maxSpeed !== undefined ? this._convertValue(behavior.maxSpeed) : undefined,
				};
				return Behavior as Behavior;
			}

			case "OrbitOverLife": {
				const behavior = quarksBehavior as QuarksOrbitOverLifeBehavior;
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
				return quarksBehavior as Behavior;
		}
	}

	/**
	 * Convert Quarks materials to  materials
	 */
	private _convertMaterials(quarksMaterials: QuarksMaterial[]): Material[] {
		return quarksMaterials.map((quarks) => {
			const material: Material = {
				uuid: quarks.uuid,
				type: quarks.type,
				transparent: quarks.transparent,
				depthWrite: quarks.depthWrite,
				side: quarks.side,
				map: quarks.map,
			};

			// Convert color from hex to Color3
			if (quarks.color !== undefined) {
				const colorHex = typeof quarks.color === "number" ? quarks.color : parseInt(String(quarks.color).replace("#", ""), 16) || 0xffffff;
				const r = ((colorHex >> 16) & 0xff) / 255;
				const g = ((colorHex >> 8) & 0xff) / 255;
				const b = (colorHex & 0xff) / 255;
				material.color = new Color3(r, g, b);
			}

			// Convert blending mode (Three.js → Babylon.js)
			if (quarks.blending !== undefined) {
				const blendModeMap: Record<number, number> = {
					0: 0, // NoBlending → ALPHA_DISABLE
					1: 1, // NormalBlending → ALPHA_COMBINE
					2: 2, // AdditiveBlending → ALPHA_ADD
				};
				material.blending = blendModeMap[quarks.blending] ?? quarks.blending;
			}

			return material;
		});
	}

	/**
	 * Convert Quarks textures to  textures
	 */
	private _convertTextures(quarksTextures: QuarksTexture[]): Texture[] {
		return quarksTextures.map((quarks) => {
			const texture: Texture = {
				uuid: quarks.uuid,
				image: quarks.image,
				generateMipmaps: quarks.generateMipmaps,
				flipY: quarks.flipY,
			};

			// Convert wrap mode (Three.js → Babylon.js)
			if (quarks.wrap && Array.isArray(quarks.wrap)) {
				const wrapModeMap: Record<number, number> = {
					1000: BabylonTexture.WRAP_ADDRESSMODE, // RepeatWrapping
					1001: BabylonTexture.CLAMP_ADDRESSMODE, // ClampToEdgeWrapping
					1002: BabylonTexture.MIRROR_ADDRESSMODE, // MirroredRepeatWrapping
				};
				texture.wrapU = wrapModeMap[quarks.wrap[0]] ?? BabylonTexture.WRAP_ADDRESSMODE;
				texture.wrapV = wrapModeMap[quarks.wrap[1]] ?? BabylonTexture.WRAP_ADDRESSMODE;
			}

			// Convert repeat to scale
			if (quarks.repeat && Array.isArray(quarks.repeat)) {
				texture.uScale = quarks.repeat[0] || 1;
				texture.vScale = quarks.repeat[1] || 1;
			}

			// Convert offset
			if (quarks.offset && Array.isArray(quarks.offset)) {
				texture.uOffset = quarks.offset[0] || 0;
				texture.vOffset = quarks.offset[1] || 0;
			}

			// Convert rotation
			if (quarks.rotation !== undefined) {
				texture.uAng = quarks.rotation;
			}

			// Convert channel
			if (typeof quarks.channel === "number") {
				texture.coordinatesIndex = quarks.channel;
			}

			// Convert sampling mode (Three.js filters → Babylon.js sampling mode)
			if (quarks.minFilter !== undefined) {
				if (quarks.minFilter === 1008 || quarks.minFilter === 1009) {
					texture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
				} else if (quarks.minFilter === 1007 || quarks.minFilter === 1006) {
					texture.samplingMode = BabylonTexture.BILINEAR_SAMPLINGMODE;
				} else {
					texture.samplingMode = BabylonTexture.NEAREST_SAMPLINGMODE;
				}
			} else if (quarks.magFilter !== undefined) {
				texture.samplingMode = quarks.magFilter === 1006 ? BabylonTexture.BILINEAR_SAMPLINGMODE : BabylonTexture.NEAREST_SAMPLINGMODE;
			} else {
				texture.samplingMode = BabylonTexture.TRILINEAR_SAMPLINGMODE;
			}

			return texture;
		});
	}

	/**
	 * Convert Quarks images to  images (normalize URLs)
	 */
	private _convertImages(quarksImages: QuarksImage[]): Image[] {
		return quarksImages.map((quarks) => ({
			uuid: quarks.uuid,
			url: quarks.url || "",
		}));
	}

	/**
	 * Convert Quarks geometries to  geometries (convert to left-handed)
	 */
	private _convertGeometries(quarksGeometries: QuarksGeometry[]): Geometry[] {
		return quarksGeometries.map((quarks) => {
			if (quarks.type === "PlaneGeometry") {
				// PlaneGeometry - simple properties
				const geometry: Geometry = {
					uuid: quarks.uuid,
					type: "PlaneGeometry",
					width: (quarks as any).width ?? 1,
					height: (quarks as any).height ?? 1,
				};
				return geometry;
			} else if (quarks.type === "BufferGeometry") {
				// BufferGeometry - convert attributes to left-handed
				const geometry: Geometry = {
					uuid: quarks.uuid,
					type: "BufferGeometry",
				};

				if (quarks.data?.attributes) {
					const attributes: GeometryData["attributes"] = {};
					const quarksAttrs = quarks.data.attributes;

					// Convert position (right-hand → left-hand: flip Z)
					if (quarksAttrs.position) {
						const positions = Array.from(quarksAttrs.position.array);
						// Flip Z coordinate for left-handed system
						for (let i = 2; i < positions.length; i += 3) {
							positions[i] = -positions[i];
						}
						attributes.position = {
							array: positions,
							itemSize: quarksAttrs.position.itemSize,
						};
					}

					// Convert normal (right-hand → left-hand: flip Z)
					if (quarksAttrs.normal) {
						const normals = Array.from(quarksAttrs.normal.array);
						for (let i = 2; i < normals.length; i += 3) {
							normals[i] = -normals[i];
						}
						attributes.normal = {
							array: normals,
							itemSize: quarksAttrs.normal.itemSize,
						};
					}

					// UV and color - no conversion needed
					if (quarksAttrs.uv) {
						attributes.uv = {
							array: Array.from(quarksAttrs.uv.array),
							itemSize: quarksAttrs.uv.itemSize,
						};
					}

					if (quarksAttrs.color) {
						attributes.color = {
							array: Array.from(quarksAttrs.color.array),
							itemSize: quarksAttrs.color.itemSize,
						};
					}

					geometry.data = {
						attributes,
					};

					// Convert indices (reverse winding order for left-handed)
					if (quarks.data.index) {
						const indices = Array.from(quarks.data.index.array);
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
				uuid: quarks.uuid,
				type: quarks.type as "PlaneGeometry" | "BufferGeometry",
			};
		});
	}
}
