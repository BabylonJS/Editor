import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

import { EffectParticleSystem, EffectSolidParticleSystem } from "../systems";
import { IData, IGroup, IEmitter, ITransform, IParticleSystemConfig, ILoaderOptions, IMaterialFactory, IGeometryFactory, IEffectNode, isSystem } from "../types";
import { Logger } from "../loggers/logger";
import { CapacityCalculator, ValueUtils } from "../utils";
import { MaterialFactory } from "./materialFactory";
import { GeometryFactory } from "./geometryFactory";
/**
 * Factory for creating particle systems from data
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class NodeFactory {
	private _logger: Logger;
	private _scene: Scene;
	private _data: IData;

	private _materialFactory: IMaterialFactory;
	private _geometryFactory: IGeometryFactory;

	constructor(scene: Scene, data: IData, rootUrl: string, options?: ILoaderOptions) {
		this._scene = scene;
		this._data = data;
		this._logger = new Logger("[SystemFactory]", options);
		this._materialFactory = new MaterialFactory(scene, data, rootUrl, options);
		this._geometryFactory = new GeometryFactory(data, options);
	}

	/**
	 * Create particle systems from  data
	 * Creates all nodes, sets parents, and applies transformations in one pass
	 */
	public create(): IEffectNode {
		if (!this._data.root) {
			this._logger.warn("No root object found in  data");
			return this._createRootNode();
		}
		return this._createNode(this._data.root, null);
	}

	/**
	 * Create a new group node
	 * @param name Group name
	 * @param parentNode Parent node (optional)
	 * @returns Created group node
	 */
	public createGroup(name: string, parentNode: IEffectNode | null = null): IEffectNode {
		const groupUuid = Tools.RandomId();
		const group: IGroup = {
			uuid: groupUuid,
			name,
			transform: {
				position: Vector3.Zero(),
				rotation: Vector3.Zero(),
				scale: Vector3.One(),
			},
			children: [],
		};

		return this._createGroupNode(group, parentNode);
	}

	/**
	 * Create a new particle system node
	 * @param name System name
	 * @param systemType Type of system ("solid" or "base")
	 * @param config Optional particle system config
	 * @param parentNode Parent node (optional)
	 * @returns Created particle system node
	 */
	public createParticleSystem(name: string, systemType: "solid" | "base" = "base", config?: Partial<IParticleSystemConfig>, parentNode: IEffectNode | null = null): IEffectNode {
		const systemUuid = Tools.RandomId();
		const defaultConfig: IParticleSystemConfig = {
			systemType,
			targetStopDuration: 0, // looping
			manualEmitCount: -1,
			emitRate: 10,
			minLifeTime: 1,
			maxLifeTime: 1,
			minEmitPower: 1,
			maxEmitPower: 1,
			minSize: 1,
			maxSize: 1,
			color1: new Color4(1, 1, 1, 1),
			color2: new Color4(1, 1, 1, 1),
			behaviors: [],
			...config,
		};

		const emitter: IEmitter = {
			uuid: systemUuid,
			name,
			transform: {
				position: Vector3.Zero(),
				rotation: Vector3.Zero(),
				scale: Vector3.One(),
			},
			config: defaultConfig,
			systemType,
		};

		return this._createParticleNode(emitter, parentNode);
	}

	private _createRootNode(): IEffectNode {
		const rootGroup = new TransformNode("Root", this._scene);
		const rootUuid = Tools.RandomId();
		rootGroup.id = rootUuid;
		const rootNode: IEffectNode = {
			name: "Root",
			uuid: rootUuid,
			data: rootGroup,
			children: [],
			type: "group",
		};
		return rootNode;
	}
	/**
	 * Recursively process  object hierarchy
	 * Creates nodes, sets parents, and applies transformations in one pass
	 */
	private _createNode(obj: IGroup | IEmitter, parentNode: IEffectNode | null): IEffectNode {
		this._logger.log(`Processing object: ${obj.name}`);

		if ("children" in obj && obj.children) {
			const groupNode = this._createGroupNode(obj as IGroup, parentNode);
			groupNode.children = obj.children.map((child) => this._createNode(child, groupNode));
			return groupNode;
		} else {
			return this._createParticleNode(obj as IEmitter, parentNode);
		}
	}

	/**
	 * Create a TransformNode for a  Group
	 */
	private _createGroupNode(group: IGroup, parentNode: IEffectNode | null): IEffectNode {
		const transformNode = new TransformNode(group.name, this._scene);
		transformNode.id = group.uuid;
		const node: IEffectNode = {
			name: group.name,
			uuid: group.uuid,
			children: [],
			data: transformNode,
			type: "group",
		};

		this._applyTransform(node, group.transform);

		if (parentNode) {
			(node.data as TransformNode).parent = parentNode.data as TransformNode;
		}

		this._logger.log(`Created group node: ${group.name}`);
		return node;
	}

	/**
	 * Create a particle system from a  Emitter
	 */
	private _createParticleNode(emitter: IEmitter, parentNode: IEffectNode | null): IEffectNode {
		let particleSystem: EffectParticleSystem | EffectSolidParticleSystem;

		if (emitter.config.systemType === "solid") {
			particleSystem = this._createEffectSolidParticleSystem(emitter);
		} else {
			particleSystem = this._createEffectParticleSystem(emitter);
		}

		const node: IEffectNode = {
			name: emitter.name,
			uuid: emitter.uuid,
			children: [],
			data: particleSystem,
			type: "particle",
		};

		particleSystem.emitter = new TransformNode(emitter.name + "_emitter", this._scene) as AbstractMesh;

		if (parentNode) {
			particleSystem.emitter.parent = parentNode.data as TransformNode;
		}

		this._logger.log(`Created particle system: ${emitter.name}`);

		return node;
	}

	/**
	 * Apply common native properties to both ParticleSystem and SolidParticleSystem
	 */
	private _applyCommonProperties(system: EffectParticleSystem | EffectSolidParticleSystem, config: IParticleSystemConfig): void {
		if (config.minSize !== undefined) {
			system.minSize = config.minSize;
		}
		if (config.maxSize !== undefined) {
			system.maxSize = config.maxSize;
		}
		if (config.minLifeTime !== undefined) {
			system.minLifeTime = config.minLifeTime;
		}
		if (config.maxLifeTime !== undefined) {
			system.maxLifeTime = config.maxLifeTime;
		}
		if (config.minEmitPower !== undefined) {
			system.minEmitPower = config.minEmitPower;
		}
		if (config.maxEmitPower !== undefined) {
			system.maxEmitPower = config.maxEmitPower;
		}
		if (config.emitRate !== undefined) {
			system.emitRate = config.emitRate;
		}
		if (config.targetStopDuration !== undefined) {
			system.targetStopDuration = config.targetStopDuration;
		}
		if (config.manualEmitCount !== undefined) {
			system.manualEmitCount = config.manualEmitCount;
		}
		if (config.preWarmCycles !== undefined) {
			system.preWarmCycles = config.preWarmCycles;
		}
		if (config.preWarmStepOffset !== undefined) {
			system.preWarmStepOffset = config.preWarmStepOffset;
		}
		if (config.color1 !== undefined) {
			system.color1 = config.color1;
		}
		if (config.color2 !== undefined) {
			system.color2 = config.color2;
		}
		if (config.colorDead !== undefined) {
			system.colorDead = config.colorDead;
		}
		if (config.minInitialRotation !== undefined) {
			system.minInitialRotation = config.minInitialRotation;
		}
		if (config.maxInitialRotation !== undefined) {
			system.maxInitialRotation = config.maxInitialRotation;
		}
		if (config.isLocal !== undefined) {
			system.isLocal = config.isLocal;
		}
		if (config.disposeOnStop !== undefined) {
			system.disposeOnStop = config.disposeOnStop;
		}
		if (config.gravity !== undefined) {
			system.gravity = config.gravity;
		}
		if (config.noiseStrength !== undefined) {
			system.noiseStrength = config.noiseStrength;
		}
		if (config.updateSpeed !== undefined) {
			system.updateSpeed = config.updateSpeed;
		}
		if (config.minAngularSpeed !== undefined) {
			system.minAngularSpeed = config.minAngularSpeed;
		}
		if (config.maxAngularSpeed !== undefined) {
			system.maxAngularSpeed = config.maxAngularSpeed;
		}
		if (config.minScaleX !== undefined) {
			system.minScaleX = config.minScaleX;
		}
		if (config.maxScaleX !== undefined) {
			system.maxScaleX = config.maxScaleX;
		}
		if (config.minScaleY !== undefined) {
			system.minScaleY = config.minScaleY;
		}
		if (config.maxScaleY !== undefined) {
			system.maxScaleY = config.maxScaleY;
		}
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
	private _applyEmissionBursts(system: EffectParticleSystem | EffectSolidParticleSystem, config: IParticleSystemConfig): void {
		if (!config.emissionBursts || config.emissionBursts.length === 0) {
			return;
		}

		const duration = config.targetStopDuration !== undefined && config.targetStopDuration > 0 ? config.targetStopDuration : 5;
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
	private _createEffectParticleSystem(emitter: IEmitter): EffectParticleSystem {
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
		this._applyEmissionBursts(particleSystem, config);

		// ParticleSystem-specific: billboard mode
		if (config.billboardMode !== undefined) {
			particleSystem.billboardMode = config.billboardMode;
		}

		// // === Создание emitter ===
		// const rotationMatrix = emitter.matrix ? MatrixUtils.extractRotationMatrix(emitter.matrix) : null;
		if (config.shape) {
			particleSystem.configureEmitterFromShape(config.shape);
		}

		this._logger.log(`ParticleSystem created: ${name}`);
		return particleSystem;
	}

	/**
	 * Create a SolidParticleSystem instance
	 */
	private _createEffectSolidParticleSystem(emitter: IEmitter): EffectSolidParticleSystem {
		const { name, config } = emitter;

		this._logger.log(`Creating SolidParticleSystem: ${name}`);

		const particleMesh = this._geometryFactory.createParticleMesh(config, name, this._scene);

		if (emitter.materialId) {
			const material = this._materialFactory.createMaterial(emitter.materialId, name);
			if (material) {
				particleMesh.material = material;
			}
		}

		const sps = new EffectSolidParticleSystem(name, this._scene, {
			updatable: true,
			expandable: true,
			useModelMaterial: true,
		});

		// Set particle mesh (only adds shape, doesn't build mesh or dispose)
		sps.particleMesh = particleMesh;

		this._applyCommonProperties(sps, config);
		this._applyGradients(sps, config);
		this._applyCommonOptions(sps, config);
		this._applyEmissionBursts(sps, config);

		if (config.emissionOverDistance !== undefined) {
			sps.emissionOverDistance = config.emissionOverDistance;
		}

		if (config.shape) {
			sps.configureEmitterFromShape(config.shape);
		}

		// Dispose source mesh after it's been added as shape
		// SPS will clone it in buildMesh() during start()
		particleMesh.dispose();

		this._logger.log(`SolidParticleSystem created: ${name}`);
		return sps;
	}

	/**
	 * Apply transform to a node
	 */
	private _applyTransform(node: IEffectNode, transform: ITransform): void {
		if (!transform) {
			this._logger.warn(`Transform is undefined for node: ${node.name}`);
			return;
		}

		if (!isSystem(node.data)) {
			if (transform.position && node.data.position) {
				node.data.position.copyFrom(transform.position);
			}

			if (transform.rotation && node.data.rotation) {
				node.data.rotationQuaternion = null;
				node.data.rotation.copyFrom(transform.rotation);
			}

			if (transform.scale && node.data.scaling) {
				node.data.scaling.copyFrom(transform.scale);
			}
		}

		this._logger.log(
			`Applied transform: pos=(${transform.position.x.toFixed(2)}, ${transform.position.y.toFixed(2)}, ${transform.position.z.toFixed(2)}), scale=(${transform.scale.x.toFixed(2)}, ${transform.scale.y.toFixed(2)}, ${transform.scale.z.toFixed(2)})`
		);
	}
}
