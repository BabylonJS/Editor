import { Nullable, Vector3, TransformNode, Scene, AbstractMesh } from "babylonjs";
import { EffectParticleSystem } from "../systems/effectParticleSystem";
import { EffectSolidParticleSystem } from "../systems/effectSolidParticleSystem";
import type { IData, IGroup, IEmitter, ITransform } from "../types/hierarchy";
import type { IParticleSystemConfig } from "../types/emitter";
import { Logger } from "../loggers/logger";
import { MatrixUtils } from "../utils/matrixUtils";
import type { IMaterialFactory, IGeometryFactory } from "../types/factories";
import type { ILoaderOptions } from "../types/loader";
import { CapacityCalculator } from "../utils/capacityCalculator";
import { ValueUtils } from "../utils/valueParser";

/**
 * Factory for creating particle systems from data
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class SystemFactory {
	private _logger: Logger;
	private _scene: Scene;
	private _groupNodesMap: Map<string, TransformNode>;
	private _materialFactory: IMaterialFactory;
	private _geometryFactory: IGeometryFactory;

	constructor(scene: Scene, options: ILoaderOptions, groupNodesMap: Map<string, TransformNode>, materialFactory: IMaterialFactory, geometryFactory: IGeometryFactory) {
		this._scene = scene;
		this._groupNodesMap = groupNodesMap;
		this._logger = new Logger("[SystemFactory]", options);
		this._materialFactory = materialFactory;
		this._geometryFactory = geometryFactory;
	}

	/**
	 * Create particle systems from  data
	 * Creates all nodes, sets parents, and applies transformations in one pass
	 */
	public createSystems(data: IData): (EffectParticleSystem | EffectSolidParticleSystem)[] {
		if (!data.root) {
			this._logger.warn("No root object found in  data");
			return [];
		}

		this._logger.log("Processing hierarchy: creating nodes, setting parents, and applying transformations");
		const particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._processObject(data.root, null, 0, particleSystems, data);
		return particleSystems;
	}

	/**
	 * Recursively process  object hierarchy
	 * Creates nodes, sets parents, and applies transformations in one pass
	 */
	private _processObject(
		obj: IGroup | IEmitter,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[],
		data: IData
	): void {
		this._logger.log(`${"  ".repeat(depth)}Processing object: ${obj.name}`);

		if (this._isGroup(obj)) {
			this._processGroup(obj, parentGroup, depth, particleSystems, data);
		} else {
			this._processEmitter(obj, parentGroup, depth, particleSystems);
		}
	}

	/**
	 * Process a  Group object
	 */
	private _processGroup(
		group: IGroup,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[],
		data: IData
	): void {
		const groupNode = this._createGroupNode(group, parentGroup, depth);
		this._processChildren(group.children, groupNode, depth, particleSystems, data);
	}

	/**
	 * Process a  Emitter object
	 */
	private _processEmitter(emitter: IEmitter, parentGroup: Nullable<TransformNode>, depth: number, particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[]): void {
		const particleSystem = this._createEffectSystem(emitter, parentGroup, depth);
		if (particleSystem) {
			particleSystems.push(particleSystem);
		}
	}

	/**
	 * Process children of a group recursively
	 */
	private _processChildren(
		children: (IGroup | IEmitter)[] | undefined,
		parentGroup: TransformNode,
		depth: number,
		particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[],
		data: IData
	): void {
		if (!children || children.length === 0) {
			return;
		}

		this._logger.log(`${"  ".repeat(depth)}Processing ${children.length} children`);
		children.forEach((child) => {
			this._processObject(child, parentGroup, depth + 1, particleSystems, data);
		});
	}

	/**
	 * Create a TransformNode for a  Group
	 */
	private _createGroupNode(group: IGroup, parentGroup: Nullable<TransformNode>, depth: number): TransformNode {
		const groupNode = new TransformNode(group.name, this._scene);
		groupNode.id = group.uuid;

		this._applyTransform(groupNode, group.transform, depth);
		this._setParent(groupNode, parentGroup, depth);

		// Store in map for potential future reference
		this._groupNodesMap.set(group.uuid, groupNode);

		this._logger.log(`${"  ".repeat(depth)}Created group node: ${group.name}`);
		return groupNode;
	}

	/**
	 * Create a particle system from a  Emitter
	 */
	private _createEffectSystem(emitter: IEmitter, parentGroup: Nullable<TransformNode>, depth: number): Nullable<EffectParticleSystem | EffectSolidParticleSystem> {
		const indent = "  ".repeat(depth);
		const parentName = parentGroup ? parentGroup.name : "none";
		this._logger.log(`${indent}Processing emitter: ${emitter.name} (parent: ${parentName})`);

		try {
			const config = emitter.config;
			if (!config) {
				this._logger.warn(`${indent}Emitter ${emitter.name} has no config, skipping`);
				return null;
			}

			const isLooping = config.targetStopDuration === 0;
			this._logger.log(`${indent}  Config: targetStopDuration=${config.targetStopDuration}, looping=${isLooping}, systemType=${emitter.systemType}`);

			const cumulativeScale = this._calculateCumulativeScale(parentGroup);
			this._logger.log(`${indent}Cumulative scale: (${cumulativeScale.x.toFixed(2)}, ${cumulativeScale.y.toFixed(2)}, ${cumulativeScale.z.toFixed(2)})`);

			// Use systemType from emitter (determined during conversion)
			const systemType = emitter.systemType || "base";
			this._logger.log(`Using ${systemType === "solid" ? "SolidParticleSystem" : "ParticleSystem"}`);

			let particleSystem: EffectParticleSystem | EffectSolidParticleSystem | null = null;

			try {
				if (systemType === "solid") {
					particleSystem = this._createEffectSolidParticleSystem(emitter, parentGroup);
				} else {
					particleSystem = this._createEffectParticleSystem(emitter, parentGroup, cumulativeScale, depth);
				}
			} catch (error) {
				this._logger.error(`${indent}Failed to create ${systemType} system for emitter ${emitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				return null;
			}

			if (!particleSystem) {
				this._logger.warn(`${indent}Failed to create particle system for emitter: ${emitter.name}`);
				return null;
			}

			// Apply transform to particle system
			try {
				if (particleSystem instanceof EffectSolidParticleSystem) {
					// For SPS, transform is applied to the mesh
					if (particleSystem.mesh) {
						this._applyTransform(particleSystem.mesh, emitter.transform, depth);
						this._setParent(particleSystem.mesh, parentGroup, depth);
					}
				} else if (particleSystem instanceof EffectParticleSystem) {
					// For PS, transform is applied to the emitter mesh
					const emitterNode = particleSystem.getParentNode();
					if (emitterNode) {
						this._applyTransform(emitterNode, emitter.transform, depth);
						this._setParent(emitterNode, parentGroup, depth);
					}
				}
			} catch (error) {
				this._logger.warn(`${indent}Failed to apply transform to system ${emitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				// Continue - system is created, just transform failed
			}

			this._logger.log(`${indent}Created particle system: ${emitter.name}`);
			return particleSystem;
		} catch (error) {
			this._logger.error(`${indent}Unexpected error creating particle system ${emitter.name}: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	/**
	 * Apply common native properties to both ParticleSystem and SolidParticleSystem
	 */
	private _applyCommonProperties(system: EffectParticleSystem | EffectSolidParticleSystem, config: IParticleSystemConfig): void {
		if (config.minSize !== undefined) {system.minSize = config.minSize;}
		if (config.maxSize !== undefined) {system.maxSize = config.maxSize;}
		if (config.minLifeTime !== undefined) {system.minLifeTime = config.minLifeTime;}
		if (config.maxLifeTime !== undefined) {system.maxLifeTime = config.maxLifeTime;}
		if (config.minEmitPower !== undefined) {system.minEmitPower = config.minEmitPower;}
		if (config.maxEmitPower !== undefined) {system.maxEmitPower = config.maxEmitPower;}
		if (config.emitRate !== undefined) {system.emitRate = config.emitRate;}
		if (config.targetStopDuration !== undefined) {system.targetStopDuration = config.targetStopDuration;}
		if (config.manualEmitCount !== undefined) {system.manualEmitCount = config.manualEmitCount;}
		if (config.preWarmCycles !== undefined) {system.preWarmCycles = config.preWarmCycles;}
		if (config.preWarmStepOffset !== undefined) {system.preWarmStepOffset = config.preWarmStepOffset;}
		if (config.color1 !== undefined) {system.color1 = config.color1;}
		if (config.color2 !== undefined) {system.color2 = config.color2;}
		if (config.colorDead !== undefined) {system.colorDead = config.colorDead;}
		if (config.minInitialRotation !== undefined) {system.minInitialRotation = config.minInitialRotation;}
		if (config.maxInitialRotation !== undefined) {system.maxInitialRotation = config.maxInitialRotation;}
		if (config.isLocal !== undefined) {system.isLocal = config.isLocal;}
		if (config.disposeOnStop !== undefined) {system.disposeOnStop = config.disposeOnStop;}
		if (config.gravity !== undefined) {system.gravity = config.gravity;}
		if (config.noiseStrength !== undefined) {system.noiseStrength = config.noiseStrength;}
		if (config.updateSpeed !== undefined) {system.updateSpeed = config.updateSpeed;}
		if (config.minAngularSpeed !== undefined) {system.minAngularSpeed = config.minAngularSpeed;}
		if (config.maxAngularSpeed !== undefined) {system.maxAngularSpeed = config.maxAngularSpeed;}
		if (config.minScaleX !== undefined) {system.minScaleX = config.minScaleX;}
		if (config.maxScaleX !== undefined) {system.maxScaleX = config.maxScaleX;}
		if (config.minScaleY !== undefined) {system.minScaleY = config.minScaleY;}
		if (config.maxScaleY !== undefined) {system.maxScaleY = config.maxScaleY;}
	}

	/**
	 * Apply gradients (PiecewiseBezier) to both ParticleSystem and SolidParticleSystem
	 */
	private _applyGradients(system: EffectParticleSystem | EffectSolidParticleSystem, config: IParticleSystemConfig): void {
		if (config.startSizeGradients) {
			for (const grad of config.startSizeGradients) {
				system.addStartSizeGradient(grad.gradient, grad.factor, grad.factor2);
			}
		}
		if (config.lifeTimeGradients) {
			for (const grad of config.lifeTimeGradients) {
				system.addLifeTimeGradient(grad.gradient, grad.factor, grad.factor2);
			}
		}
		if (config.emitRateGradients) {
			for (const grad of config.emitRateGradients) {
				system.addEmitRateGradient(grad.gradient, grad.factor, grad.factor2);
			}
		}
	}

	/**
	 * Apply common rendering and behavior options
	 */
	private _applyCommonOptions(system: EffectParticleSystem | EffectSolidParticleSystem, config: IParticleSystemConfig): void {
		// Rendering
		if (config.renderOrder !== undefined) {
			if (system instanceof EffectParticleSystem) {
				system.renderingGroupId = config.renderOrder;
			} else {
				system.renderOrder = config.renderOrder;
			}
		}
		if (config.layers !== undefined) {
			if (system instanceof EffectParticleSystem) {
				system.layerMask = config.layers;
			} else {
				system.layers = config.layers;
			}
		}

		// Billboard
		if (config.isBillboardBased !== undefined) {
			system.isBillboardBased = config.isBillboardBased;
		}

		// Behaviors
		if (config.behaviors) {
			system.setBehaviors(config.behaviors);
		}
	}

	/**
	 * Apply emission bursts by converting them to emit rate gradients
	 * Unified approach for both ParticleSystem and SolidParticleSystem
	 */
	private _applyEmissionBursts(system: EffectParticleSystem | EffectSolidParticleSystem, config: IParticleSystemConfig, duration: number): void {
		if (!config.emissionBursts || config.emissionBursts.length === 0) {
			return;
		}

		const baseEmitRate = config.emitRate || 10;
		for (const burst of config.emissionBursts) {
			if (burst.time !== undefined && burst.count !== undefined) {
				const burstTime = ValueUtils.parseConstantValue(burst.time);
				const burstCount = ValueUtils.parseConstantValue(burst.count);
				const timeRatio = Math.min(Math.max(burstTime / duration, 0), 1);
				const windowSize = 0.02;
				const burstEmitRate = burstCount / windowSize;
				const beforeTime = Math.max(0, timeRatio - windowSize);
				const afterTime = Math.min(1, timeRatio + windowSize);
				system.addEmitRateGradient(beforeTime, baseEmitRate);
				system.addEmitRateGradient(timeRatio, burstEmitRate);
				system.addEmitRateGradient(afterTime, baseEmitRate);
			}
		}
	}

	/**
	 * Create a ParticleSystem instance
	 */
	private _createEffectParticleSystem(emitter: IEmitter, _parentGroup: Nullable<TransformNode>, cumulativeScale: Vector3, _depth: number): Nullable<EffectParticleSystem> {
		const { name, config } = emitter;

		this._logger.log(`Creating ParticleSystem: ${name}`);

		// Calculate capacity
		const duration = config.targetStopDuration !== undefined && config.targetStopDuration > 0 ? config.targetStopDuration : 5;
		const emitRate = config.emitRate || 10;
		const capacity = CapacityCalculator.calculateForParticleSystem(emitRate, duration);

		// Create instance (simple constructor)
		const particleSystem = new EffectParticleSystem(name, capacity, this._scene);

		// Apply common properties and gradients
		this._applyCommonProperties(particleSystem, config);
		this._applyGradients(particleSystem, config);

		// === Настройка текстуры и blend mode ===
		if (emitter.materialId) {
			const texture = this._materialFactory.createTexture(emitter.materialId);
			if (texture) {
				particleSystem.particleTexture = texture;
			}
			const blendMode = this._materialFactory.getBlendMode(emitter.materialId);
			if (blendMode !== undefined) {
				particleSystem.blendMode = blendMode;
			}
		}

		// === Настройка sprite tiles ===
		if (config.uTileCount !== undefined && config.vTileCount !== undefined) {
			if (config.uTileCount > 1 || config.vTileCount > 1) {
				particleSystem.isAnimationSheetEnabled = true;
				particleSystem.spriteCellWidth = config.uTileCount;
				particleSystem.spriteCellHeight = config.vTileCount;
				if (config.startTileIndex !== undefined) {
					const startTile = ValueUtils.parseConstantValue(config.startTileIndex);
					particleSystem.startSpriteCellID = Math.floor(startTile);
					particleSystem.endSpriteCellID = Math.floor(startTile);
				}
			}
		}

		// Apply common rendering and behavior options
		this._applyCommonOptions(particleSystem, config);

		// Apply emission bursts (converted to gradients)
		this._applyEmissionBursts(particleSystem, config, duration);

		// ParticleSystem-specific: billboard mode
		if (config.billboardMode !== undefined) {
			particleSystem.billboardMode = config.billboardMode;
		}

		// === Создание emitter ===
		const rotationMatrix = emitter.matrix ? MatrixUtils.extractRotationMatrix(emitter.matrix) : null;
		particleSystem.configureEmitterFromShape(config.shape, cumulativeScale, rotationMatrix);

		this._logger.log(`ParticleSystem created: ${name}`);
		return particleSystem;
	}

	/**
	 * Create a SolidParticleSystem instance
	 */
	private _createEffectSolidParticleSystem(emitter: IEmitter, parentGroup: Nullable<TransformNode>): Nullable<EffectSolidParticleSystem> {
		const { name, config } = emitter;

		this._logger.log(`Creating SolidParticleSystem: ${name}`);

		// Create or load particle mesh
		const particleMesh = this._geometryFactory.createParticleMesh(config, name, this._scene);
		if (!particleMesh) {
			return null;
		}

		// Apply material if provided
		if (emitter.materialId) {
			const material = this._materialFactory.createMaterial(emitter.materialId, name);
			if (material) {
				particleMesh.material = material;
			}
		}

		// Create SPS instance (simple constructor)
		const sps = new EffectSolidParticleSystem(name, this._scene, {
			updatable: true,
			isPickable: false,
			enableDepthSort: false,
			particleIntersection: false,
			useModelMaterial: true,
		});

		// Set particle mesh and emitter (like ParticleSystem interface)
		sps.particleMesh = particleMesh;
		if (parentGroup) {
			sps.emitter = parentGroup as AbstractMesh;
		}

		// Apply common properties and gradients
		this._applyCommonProperties(sps, config);
		this._applyGradients(sps, config);

		// Apply common rendering and behavior options
		this._applyCommonOptions(sps, config);

		// Apply emission bursts (converted to gradients)
		const duration = config.targetStopDuration !== undefined && config.targetStopDuration > 0 ? config.targetStopDuration : 5;
		this._applyEmissionBursts(sps, config, duration);

		// === SolidParticleSystem-specific properties ===
		// Distance-based emission
		if (config.emissionOverDistance !== undefined) {
			sps.emissionOverDistance = config.emissionOverDistance;
		}

		// === Создание emitter ===
		sps.configureEmitterFromShape(config.shape);

		this._logger.log(`SolidParticleSystem created: ${name}`);
		return sps;
	}

	/**
	 * Calculate cumulative scale from parent groups
	 */
	private _calculateCumulativeScale(parent: Nullable<TransformNode>): Vector3 {
		const cumulativeScale = new Vector3(1, 1, 1);
		let current = parent;

		while (current) {
			cumulativeScale.x *= current.scaling.x;
			cumulativeScale.y *= current.scaling.y;
			cumulativeScale.z *= current.scaling.z;
			current = current.parent as TransformNode;
		}

		return cumulativeScale;
	}

	// Type guards
	private _isGroup(Obj: IGroup | IEmitter): Obj is IGroup {
		return "children" in Obj;
	}

	/**
	 * Apply transform to a node
	 */
	private _applyTransform(node: TransformNode, transform: ITransform, depth: number): void {
		if (!transform) {
			this._logger.warn(`Transform is undefined for node: ${node.name}`);
			return;
		}

		if (transform.position && node.position) {
			node.position.copyFrom(transform.position);
		}

		if (transform.rotation) {
			node.rotationQuaternion = transform.rotation.clone();
		}

		if (transform.scale && node.scaling) {
			node.scaling.copyFrom(transform.scale);
		}

		if (transform.position && transform.scale) {
			const indent = "  ".repeat(depth);
			this._logger.log(
				`${indent}Applied transform: pos=(${transform.position.x.toFixed(2)}, ${transform.position.y.toFixed(2)}, ${transform.position.z.toFixed(2)}), scale=(${transform.scale.x.toFixed(2)}, ${transform.scale.y.toFixed(2)}, ${transform.scale.z.toFixed(2)})`
			);
		}
	}

	/**
	 * Set parent for a node
	 */
	private _setParent(node: TransformNode | any, parent: Nullable<TransformNode>, depth: number): void {
		if (!parent || !node) {
			return;
		}

		// Check if node has setParent method (TransformNode, AbstractMesh, etc.)
		if (typeof node.setParent === "function") {
			node.setParent(parent, false, true);
			const indent = "  ".repeat(depth);
			this._logger.log(`${indent}Set parent: ${node.name || "unknown"} -> ${parent.name}`);
		} else {
			const indent = "  ".repeat(depth);
			this._logger.warn(`${indent}Node does not support setParent: ${node.constructor?.name || "unknown"}`);
		}
	}
}
