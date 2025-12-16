import { Nullable, Vector3, TransformNode, Texture, Scene } from "babylonjs";
import { EffectParticleSystem } from "../systems/effectParticleSystem";
import { EffectSolidParticleSystem } from "../systems/effectSolidParticleSystem";
import type { Data, Group, Emitter, Transform } from "../types/hierarchy";
import { Logger } from "../loggers/logger";
import { MatrixUtils } from "../utils/matrixUtils";
import { EmitterFactory } from "./emitterFactory";
import type { IMaterialFactory, IGeometryFactory } from "../types/factories";
import type { LoaderOptions } from "../types/loader";

/**
 * Factory for creating particle systems from  data
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class SystemFactory {
	private _logger: Logger;
	private _scene: Scene;
	private _groupNodesMap: Map<string, TransformNode>;
	private _materialFactory: IMaterialFactory;
	private _geometryFactory: IGeometryFactory;
	private _emitterFactory: EmitterFactory;

	constructor(scene: Scene, options: LoaderOptions, groupNodesMap: Map<string, TransformNode>, materialFactory: IMaterialFactory, geometryFactory: IGeometryFactory) {
		this._scene = scene;
		this._groupNodesMap = groupNodesMap;
		this._logger = new Logger("[SystemFactory]", options);
		this._materialFactory = materialFactory;
		this._geometryFactory = geometryFactory;
		this._emitterFactory = new EmitterFactory();
	}

	/**
	 * Create particle systems from  data
	 * Creates all nodes, sets parents, and applies transformations in one pass
	 */
	public createSystems(Data: Data): (EffectParticleSystem | EffectSolidParticleSystem)[] {
		if (!Data.root) {
			this._logger.warn("No root object found in  data");
			return [];
		}

		this._logger.log("Processing hierarchy: creating nodes, setting parents, and applying transformations");
		const particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._processObject(Data.root, null, 0, particleSystems, Data);
		return particleSystems;
	}

	/**
	 * Recursively process  object hierarchy
	 * Creates nodes, sets parents, and applies transformations in one pass
	 */
	private _processObject(
		Obj: Group | Emitter,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[],
		Data: Data
	): void {
		this._logger.log(`${"  ".repeat(depth)}Processing object: ${Obj.name}`);

		if (this._isGroup(Obj)) {
			this._processGroup(Obj, parentGroup, depth, particleSystems, Data);
		} else {
			this._processEmitter(Obj, parentGroup, depth, particleSystems);
		}
	}

	/**
	 * Process a  Group object
	 */
	private _processGroup(
		Group: Group,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[],
		Data: Data
	): void {
		const groupNode = this._createGroupNode(Group, parentGroup, depth);
		this._processChildren(Group.children, groupNode, depth, particleSystems, Data);
	}

	/**
	 * Process a  Emitter object
	 */
	private _processEmitter(Emitter: Emitter, parentGroup: Nullable<TransformNode>, depth: number, particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[]): void {
		const particleSystem = this._createParticleSystem(Emitter, parentGroup, depth);
		if (particleSystem) {
			particleSystems.push(particleSystem);
		}
	}

	/**
	 * Process children of a group recursively
	 */
	private _processChildren(
		children: (Group | Emitter)[] | undefined,
		parentGroup: TransformNode,
		depth: number,
		particleSystems: (EffectParticleSystem | EffectSolidParticleSystem)[],
		Data: Data
	): void {
		if (!children || children.length === 0) {
			return;
		}

		this._logger.log(`${"  ".repeat(depth)}Processing ${children.length} children`);
		children.forEach((child) => {
			this._processObject(child, parentGroup, depth + 1, particleSystems, Data);
		});
	}

	/**
	 * Create a TransformNode for a  Group
	 */
	private _createGroupNode(Group: Group, parentGroup: Nullable<TransformNode>, depth: number): TransformNode {
		const groupNode = new TransformNode(Group.name, this._scene);
		groupNode.id = Group.uuid;

		this._applyTransform(groupNode, Group.transform, depth);
		this._setParent(groupNode, parentGroup, depth);

		// Store in map for potential future reference
		this._groupNodesMap.set(Group.uuid, groupNode);

		this._logger.log(`${"  ".repeat(depth)}Created group node: ${Group.name}`);
		return groupNode;
	}

	/**
	 * Create a particle system from a  Emitter
	 */
	private _createParticleSystem(Emitter: Emitter, parentGroup: Nullable<TransformNode>, depth: number): Nullable<EffectParticleSystem | EffectSolidParticleSystem> {
		const indent = "  ".repeat(depth);
		const parentName = parentGroup ? parentGroup.name : "none";
		this._logger.log(`${indent}Processing emitter: ${Emitter.name} (parent: ${parentName})`);

		try {
			const config = Emitter.config;
			if (!config) {
				this._logger.warn(`${indent}Emitter ${Emitter.name} has no config, skipping`);
				return null;
			}

			this._logger.log(`${indent}  Config: duration=${config.duration}, looping=${config.looping}, systemType=${Emitter.systemType}`);

			const cumulativeScale = this._calculateCumulativeScale(parentGroup);
			this._logger.log(`${indent}Cumulative scale: (${cumulativeScale.x.toFixed(2)}, ${cumulativeScale.y.toFixed(2)}, ${cumulativeScale.z.toFixed(2)})`);

			// Use systemType from emitter (determined during conversion)
			const systemType = Emitter.systemType || "base";
			this._logger.log(`Using ${systemType === "solid" ? "SolidParticleSystem" : "ParticleSystem"}`);

			let particleSystem: EffectParticleSystem | EffectSolidParticleSystem | null = null;

			try {
				if (systemType === "solid") {
					particleSystem = this._createSolidParticleSystem(Emitter, parentGroup);
				} else {
					particleSystem = this._createParticleSystemInstance(Emitter, parentGroup, cumulativeScale, depth);
				}
			} catch (error) {
				this._logger.error(`${indent}Failed to create ${systemType} system for emitter ${Emitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				return null;
			}

			if (!particleSystem) {
				this._logger.warn(`${indent}Failed to create particle system for emitter: ${Emitter.name}`);
				return null;
			}

			// Apply transform to particle system
			try {
				if (particleSystem instanceof EffectSolidParticleSystem) {
					// For SPS, transform is applied to the mesh
					if (particleSystem.mesh) {
						this._applyTransform(particleSystem.mesh, Emitter.transform, depth);
						this._setParent(particleSystem.mesh, parentGroup, depth);
					}
				} else if (particleSystem instanceof EffectParticleSystem) {
					// For PS, transform is applied to the emitter mesh
					const emitter = particleSystem.getParentNode();
					if (emitter) {
						this._applyTransform(emitter, Emitter.transform, depth);
						this._setParent(emitter, parentGroup, depth);
					}
				}
			} catch (error) {
				this._logger.warn(`${indent}Failed to apply transform to system ${Emitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				// Continue - system is created, just transform failed
			}

			this._logger.log(`${indent}Created particle system: ${Emitter.name}`);
			return particleSystem;
		} catch (error) {
			this._logger.error(`${indent}Unexpected error creating particle system ${Emitter.name}: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	/**
	 * Create a ParticleSystem instance
	 */
	private _createParticleSystemInstance(Emitter: Emitter, _parentGroup: Nullable<TransformNode>, cumulativeScale: Vector3, _depth: number): Nullable<EffectParticleSystem> {
		const { name, config } = Emitter;

		this._logger.log(`Creating ParticleSystem: ${name}`);

		// Get texture and blend mode
		const texture: Texture | undefined = Emitter.materialId ? this._materialFactory.createTexture(Emitter.materialId) || undefined : undefined;
		const blendMode = Emitter.materialId ? this._materialFactory.getBlendMode(Emitter.materialId) : undefined;

		// Extract rotation matrix from emitter matrix if available
		const rotationMatrix = Emitter.matrix ? MatrixUtils.extractRotationMatrix(Emitter.matrix) : null;

		// Create instance - all configuration happens in constructor
		const particleSystem = new EffectParticleSystem(name, this._scene, config, {
			texture,
			blendMode,
		});

		// Create emitter using factory
		this._emitterFactory.createParticleSystemEmitter(particleSystem, config.shape, cumulativeScale, rotationMatrix);

		this._logger.log(`ParticleSystem created: ${name}`);
		return particleSystem;
	}

	/**
	 * Create a SolidParticleSystem instance
	 */
	private _createSolidParticleSystem(Emitter: Emitter, parentGroup: Nullable<TransformNode>): Nullable<EffectSolidParticleSystem> {
		const { name, config } = Emitter;

		this._logger.log(`Creating SolidParticleSystem: ${name}`);

		// Get  transform
		const transform = Emitter.transform || null;

		// Create or load particle mesh
		const particleMesh = this._geometryFactory.createParticleMesh(config, name, this._scene);
		if (!particleMesh) {
			return null;
		}

		// Apply material if provided
		if (Emitter.materialId) {
			const material = this._materialFactory.createMaterial(Emitter.materialId, name);
			if (material) {
				particleMesh.material = material;
			}
		}

		// Create SPS instance - mesh initialization and capacity calculation happen in constructor
		const sps = new EffectSolidParticleSystem(name, this._scene, config, {
			updatable: true,
			isPickable: false,
			enableDepthSort: false,
			particleIntersection: false,
			useModelMaterial: true,
			parentGroup,
			transform,
			particleMesh,
		});

		// Create emitter using factory (similar to ParticleSystem)
		this._emitterFactory.createSolidParticleSystemEmitter(sps, config.shape);

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
	private _isGroup(Obj: Group | Emitter): Obj is Group {
		return "children" in Obj;
	}

	/**
	 * Apply transform to a node
	 */
	private _applyTransform(node: TransformNode, transform: Transform, depth: number): void {
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
