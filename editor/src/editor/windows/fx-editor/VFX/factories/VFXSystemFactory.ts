import { Nullable, Vector3, TransformNode, Texture, Scene } from "babylonjs";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import type { VFXData, VFXGroup, VFXEmitter, VFXTransform } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXMatrixUtils } from "../utils/matrixUtils";
import type { IVFXMaterialFactory, IVFXGeometryFactory } from "../types/factories";
import type { VFXLoaderOptions } from "../types/loader";

/**
 * Factory for creating particle systems from VFX data
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class VFXSystemFactory {
	private _logger: VFXLogger;
	private _scene: Scene;
	private _options: VFXLoaderOptions;
	private _groupNodesMap: Map<string, TransformNode>;
	private _materialFactory: IVFXMaterialFactory;
	private _geometryFactory: IVFXGeometryFactory;

	constructor(scene: Scene, options: VFXLoaderOptions, groupNodesMap: Map<string, TransformNode>, materialFactory: IVFXMaterialFactory, geometryFactory: IVFXGeometryFactory) {
		this._scene = scene;
		this._options = options;
		this._groupNodesMap = groupNodesMap;
		this._logger = new VFXLogger("[VFXSystemFactory]", options);
		this._materialFactory = materialFactory;
		this._geometryFactory = geometryFactory;
	}

	/**
	 * Create particle systems from VFX data
	 * Creates all nodes, sets parents, and applies transformations in one pass
	 */
	public createSystems(vfxData: VFXData): (VFXParticleSystem | VFXSolidParticleSystem)[] {
		if (!vfxData.root) {
			this._logger.warn("No root object found in VFX data");
			return [];
		}

		this._logger.log("Processing hierarchy: creating nodes, setting parents, and applying transformations");
		const particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[] = [];
		this._processVFXObject(vfxData.root, null, 0, particleSystems, vfxData);
		return particleSystems;
	}

	/**
	 * Recursively process VFX object hierarchy
	 * Creates nodes, sets parents, and applies transformations in one pass
	 */
	private _processVFXObject(
		vfxObj: VFXGroup | VFXEmitter,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[],
		vfxData: VFXData
	): void {
		this._logger.log(`${"  ".repeat(depth)}Processing object: ${vfxObj.name}`);

		if (this._isGroup(vfxObj)) {
			this._processGroup(vfxObj, parentGroup, depth, particleSystems, vfxData);
		} else {
			this._processEmitter(vfxObj, parentGroup, depth, particleSystems);
		}
	}

	/**
	 * Process a VFX Group object
	 */
	private _processGroup(
		vfxGroup: VFXGroup,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[],
		vfxData: VFXData
	): void {
		const groupNode = this._createGroupNode(vfxGroup, parentGroup, depth);
		this._processChildren(vfxGroup.children, groupNode, depth, particleSystems, vfxData);
	}

	/**
	 * Process a VFX Emitter object
	 */
	private _processEmitter(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number, particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[]): void {
		const particleSystem = this._createParticleSystem(vfxEmitter, parentGroup, depth);
		if (particleSystem) {
			particleSystems.push(particleSystem);
		}
	}

	/**
	 * Process children of a group recursively
	 */
	private _processChildren(
		children: (VFXGroup | VFXEmitter)[] | undefined,
		parentGroup: TransformNode,
		depth: number,
		particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[],
		vfxData: VFXData
	): void {
		if (!children || children.length === 0) {
			return;
		}

		this._logger.log(`${"  ".repeat(depth)}Processing ${children.length} children`);
		children.forEach((child) => {
			this._processVFXObject(child, parentGroup, depth + 1, particleSystems, vfxData);
		});
	}

	/**
	 * Create a TransformNode for a VFX Group
	 */
	private _createGroupNode(vfxGroup: VFXGroup, parentGroup: Nullable<TransformNode>, depth: number): TransformNode {
		const groupNode = new TransformNode(vfxGroup.name, this._scene);
		groupNode.id = vfxGroup.uuid;

		this._applyTransform(groupNode, vfxGroup.transform, depth);
		this._setParent(groupNode, parentGroup, depth);

		// Store in map for potential future reference
		this._groupNodesMap.set(vfxGroup.uuid, groupNode);

		this._logger.log(`${"  ".repeat(depth)}Created group node: ${vfxGroup.name}`);
		return groupNode;
	}

	/**
	 * Create a particle system from a VFX Emitter
	 */
	private _createParticleSystem(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number): Nullable<VFXParticleSystem | VFXSolidParticleSystem> {
		const indent = "  ".repeat(depth);
		const parentName = parentGroup ? parentGroup.name : "none";
		this._logger.log(`${indent}Processing emitter: ${vfxEmitter.name} (parent: ${parentName})`);

		try {
			const config = vfxEmitter.config;
			if (!config) {
				this._logger.warn(`${indent}Emitter ${vfxEmitter.name} has no config, skipping`);
				return null;
			}

			this._logger.log(`${indent}  Config: duration=${config.duration}, looping=${config.looping}, systemType=${vfxEmitter.systemType}`);

			const cumulativeScale = this._calculateCumulativeScale(parentGroup);
			this._logger.log(`${indent}Cumulative scale: (${cumulativeScale.x.toFixed(2)}, ${cumulativeScale.y.toFixed(2)}, ${cumulativeScale.z.toFixed(2)})`);

			// Use systemType from emitter (determined during conversion)
			const systemType = vfxEmitter.systemType || "base";
			this._logger.log(`Using ${systemType === "solid" ? "SolidParticleSystem" : "ParticleSystem"}`);

			let particleSystem: VFXParticleSystem | VFXSolidParticleSystem | null = null;

			try {
				if (systemType === "solid") {
					particleSystem = this._createSolidParticleSystem(vfxEmitter, parentGroup);
				} else {
					particleSystem = this._createParticleSystemInstance(vfxEmitter, parentGroup, cumulativeScale, depth);
				}
			} catch (error) {
				this._logger.error(`${indent}Failed to create ${systemType} system for emitter ${vfxEmitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				return null;
			}

			if (!particleSystem) {
				this._logger.warn(`${indent}Failed to create particle system for emitter: ${vfxEmitter.name}`);
				return null;
			}

			// Apply transform to particle system
			try {
				if (particleSystem instanceof VFXSolidParticleSystem) {
					// For SPS, transform is applied to the mesh
					if (particleSystem.mesh) {
						this._applyTransform(particleSystem.mesh, vfxEmitter.transform, depth);
						this._setParent(particleSystem.mesh, parentGroup, depth);
					}
				} else if (particleSystem instanceof VFXParticleSystem) {
					// For PS, transform is applied to the emitter mesh
					const emitter = particleSystem.getParentNode();
					if (emitter) {
						this._applyTransform(emitter, vfxEmitter.transform, depth);
						this._setParent(emitter, parentGroup, depth);
					}
				}
			} catch (error) {
				this._logger.warn(`${indent}Failed to apply transform to system ${vfxEmitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				// Continue - system is created, just transform failed
			}

			// Handle prewarm
			try {
				this._handlePrewarm(particleSystem, vfxEmitter.config.prewarm);
			} catch (error) {
				this._logger.warn(`${indent}Failed to handle prewarm for system ${vfxEmitter.name}: ${error instanceof Error ? error.message : String(error)}`);
				// Continue - prewarm is optional
			}

			this._logger.log(`${indent}Created particle system: ${vfxEmitter.name}`);
			return particleSystem;
		} catch (error) {
			this._logger.error(`${indent}Unexpected error creating particle system ${vfxEmitter.name}: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	/**
	 * Create a ParticleSystem instance
	 */
	private _createParticleSystemInstance(vfxEmitter: VFXEmitter, _parentGroup: Nullable<TransformNode>, cumulativeScale: Vector3, _depth: number): Nullable<VFXParticleSystem> {
		const { name, config } = vfxEmitter;

		this._logger.log(`Creating ParticleSystem: ${name}`);

		// Get texture and blend mode
		const texture: Texture | undefined = vfxEmitter.materialId ? this._materialFactory.createTexture(vfxEmitter.materialId) || undefined : undefined;
		const blendMode = vfxEmitter.materialId ? this._materialFactory.getBlendMode(vfxEmitter.materialId) : undefined;

		// Extract rotation matrix from emitter matrix if available
		const rotationMatrix = vfxEmitter.matrix ? VFXMatrixUtils.extractRotationMatrix(vfxEmitter.matrix) : null;

		// Create instance - all configuration happens in constructor
		const particleSystem = new VFXParticleSystem(name, this._scene, config, {
			texture,
			blendMode,
			emitterShape: {
				shape: config.shape,
				cumulativeScale,
				rotationMatrix,
			},
		});

		this._logger.log(`ParticleSystem created: ${name}`);
		return particleSystem;
	}

	/**
	 * Create a SolidParticleSystem instance
	 */
	private _createSolidParticleSystem(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>): Nullable<VFXSolidParticleSystem> {
		const { name, config } = vfxEmitter;

		this._logger.log(`Creating SolidParticleSystem: ${name}`);

		// Get VFX transform
		const vfxTransform = vfxEmitter.transform || null;

		// Create or load particle mesh
		const particleMesh = this._geometryFactory.createParticleMesh(config, name, this._scene);
		if (!particleMesh) {
			return null;
		}

		// Apply material if provided
		if (vfxEmitter.materialId) {
			const material = this._materialFactory.createMaterial(vfxEmitter.materialId, name);
			if (material) {
				particleMesh.material = material;
			}
		}

		// Create SPS instance - mesh initialization and capacity calculation happen in constructor
		const sps = new VFXSolidParticleSystem(name, this._scene, config, {
			updatable: true,
			isPickable: false,
			enableDepthSort: false,
			particleIntersection: false,
			useModelMaterial: true,
			parentGroup,
			vfxTransform,
			logger: this._logger,
			loaderOptions: this._options,
			particleMesh,
		});

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

	/**
	 * Handle prewarm configuration for particle system
	 */
	private _handlePrewarm(particleSystem: VFXParticleSystem | VFXSolidParticleSystem, prewarm: boolean | undefined): void {
		if (prewarm && particleSystem) {
			particleSystem.start();
		}
	}

	// Type guards
	private _isGroup(vfxObj: VFXGroup | VFXEmitter): vfxObj is VFXGroup {
		return "children" in vfxObj;
	}

	/**
	 * Apply transform to a node
	 */
	private _applyTransform(node: TransformNode, transform: VFXTransform, depth: number): void {
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
