import { Nullable, Vector3, TransformNode, Mesh, CreatePlane, Color4, Matrix, Constants, Texture } from "babylonjs";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import type { VFXParseContext } from "../types/context";
import type { VFXData, VFXGroup, VFXEmitter, VFXTransform } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXValueUtils } from "../utils/valueParser";
import type { IVFXMaterialFactory, IVFXGeometryFactory } from "../types/factories";
import type { VFXParticleEmitterConfig } from "../types/emitterConfig";

/**
 * Factory for creating particle systems from VFX data
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class VFXSystemFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _materialFactory: IVFXMaterialFactory;
	private _geometryFactory: IVFXGeometryFactory;

	constructor(context: VFXParseContext, materialFactory: IVFXMaterialFactory, geometryFactory: IVFXGeometryFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXSystemFactory]");
		this._materialFactory = materialFactory;
		this._geometryFactory = geometryFactory;
	}

	/**
	 * Create particle systems from VFX data
	 * Creates all nodes, sets parents, and applies transformations in one pass
	 */
	public createSystems(vfxData: VFXData): (VFXParticleSystem | VFXSolidParticleSystem)[] {
		if (!vfxData.root) {
			this._logWarning("No root object found in VFX data");
			return [];
		}

		this._logInfo("Processing hierarchy: creating nodes, setting parents, and applying transformations");
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
		this._logObjectProcessing(vfxObj.name, depth);

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

		this._logChildrenProcessing(children.length, depth);
		children.forEach((child) => {
			this._processVFXObject(child, parentGroup, depth + 1, particleSystems, vfxData);
		});
	}

	/**
	 * Create a TransformNode for a VFX Group
	 */
	private _createGroupNode(vfxGroup: VFXGroup, parentGroup: Nullable<TransformNode>, depth: number): TransformNode {
		const { scene } = this._context;
		const groupNode = new TransformNode(vfxGroup.name, scene);
		groupNode.id = vfxGroup.uuid;

		this._applyTransform(groupNode, vfxGroup.transform, depth);
		this._setParent(groupNode, parentGroup, depth);

		// Store in context for potential future reference
		this._context.groupNodesMap.set(vfxGroup.uuid, groupNode);

		this._logGroupCreation(vfxGroup.name, depth);
		return groupNode;
	}

	/**
	 * Create a particle system from a VFX Emitter
	 */
	private _createParticleSystem(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number): Nullable<VFXParticleSystem | VFXSolidParticleSystem> {
		this._logEmitterProcessing(vfxEmitter, parentGroup, depth);
		this._logEmitterConfig(vfxEmitter, depth);

		const cumulativeScale = this._calculateCumulativeScale(parentGroup);
		this._logCumulativeScale(cumulativeScale, depth);

		// Use systemType from emitter (determined during conversion)
		const systemType = vfxEmitter.systemType || "base";
		const { options } = this._context;
		this._logger.log(`Using ${systemType === "solid" ? "SolidParticleSystem" : "ParticleSystem"}`, options);

		let particleSystem: VFXParticleSystem | VFXSolidParticleSystem | null = null;

		if (systemType === "solid") {
			particleSystem = this._createSolidParticleSystem(vfxEmitter, parentGroup, cumulativeScale, depth);
		} else {
			particleSystem = this._createParticleSystemInstance(vfxEmitter, parentGroup, cumulativeScale, depth);
		}

		if (!particleSystem) {
			this._logWarning(`Failed to create particle system for emitter: ${vfxEmitter.name}`);
			return null;
		}

		// Apply transform to particle system
		if (particleSystem instanceof VFXSolidParticleSystem) {
			// For SPS, transform is applied to the mesh
			if (particleSystem.mesh) {
				this._applyTransform(particleSystem.mesh, vfxEmitter.transform, depth);
				this._setParent(particleSystem.mesh, parentGroup, depth);
			}
		} else if (particleSystem instanceof VFXParticleSystem) {
			// For PS, transform is applied to the emitter mesh
			const emitter = (particleSystem as any).emitter;
			if (emitter) {
				this._applyTransform(emitter, vfxEmitter.transform, depth);
				this._setParent(emitter, parentGroup, depth);
			}
		}

		// Handle prewarm
		this._handlePrewarm(particleSystem, vfxEmitter.config.prewarm);

		this._logParticleSystemCreation(vfxEmitter.name, depth);
		return particleSystem;
	}

	/**
	 * Create a ParticleSystem instance
	 */
	private _createParticleSystemInstance(vfxEmitter: VFXEmitter, _parentGroup: Nullable<TransformNode>, cumulativeScale: Vector3, _depth: number): Nullable<VFXParticleSystem> {
		const { name, config } = vfxEmitter;
		const { options, scene } = this._context;

		this._logger.log(`Creating ParticleSystem: ${name}`, options);

		// Parse values for capacity calculation
		const emissionRate = config.emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(config.emissionOverTime) : 10;
		const duration = config.duration || 5;
		const capacity = Math.ceil(emissionRate * duration * 2);
		const speed = config.startSpeed !== undefined ? VFXValueUtils.parseIntervalValue(config.startSpeed) : { min: 1, max: 1 };
		const size = config.startSize !== undefined ? VFXValueUtils.parseIntervalValue(config.startSize) : { min: 1, max: 1 };
		const startColor = config.startColor !== undefined ? VFXValueUtils.parseConstantColor(config.startColor) : new Color4(1, 1, 1, 1);
		const avgStartSpeed = (speed.min + speed.max) / 2;
		const avgStartSize = (size.min + size.max) / 2;

		// Create instance
		const particleSystem = new VFXParticleSystem(name, capacity, scene, avgStartSpeed, avgStartSize, startColor);

		// Get texture and blend mode
		const texture: Texture | undefined = vfxEmitter.materialId ? this._materialFactory.createTexture(vfxEmitter.materialId) || undefined : undefined;
		const blendMode = vfxEmitter.materialId ? this._getBlendModeFromMaterial(vfxEmitter.materialId) : undefined;

		// Extract rotation matrix from emitter matrix if available
		const rotationMatrix = vfxEmitter.matrix ? this._extractRotationMatrix(vfxEmitter.matrix) : null;

		// Configure from config
		particleSystem.configureFromConfig(config, {
			texture,
			blendMode,
			emitterShape: {
				shape: config.shape,
				cumulativeScale,
				rotationMatrix,
			},
		});

		this._logger.log(`ParticleSystem created: ${name}`, options);
		return particleSystem;
	}

	/**
	 * Create a SolidParticleSystem instance
	 */
	private _createSolidParticleSystem(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, _cumulativeScale: Vector3, _depth: number): Nullable<VFXSolidParticleSystem> {
		const { name, config } = vfxEmitter;
		const { options, scene } = this._context;

		this._logger.log(`Creating SolidParticleSystem: ${name}`, options);

		// Calculate capacity
		const emissionRate = config.emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(config.emissionOverTime) : 10;
		const particleLifetime = config.duration || 5;
		const isLooping = config.looping !== false;
		const capacity = isLooping ? Math.max(Math.ceil(emissionRate * particleLifetime), 1) : Math.ceil(emissionRate * particleLifetime * 2);

		this._logger.log(`  Capacity: ${capacity} (looping: ${isLooping})`, options);

		// Get VFX transform
		const vfxTransform = vfxEmitter.transform || null;

		// Create SPS instance
		const sps = new VFXSolidParticleSystem(name, scene, config, {
			updatable: true,
			isPickable: false,
			enableDepthSort: false,
			particleIntersection: false,
			useModelMaterial: true,
			parentGroup,
			vfxTransform,
			logger: this._logger,
			loaderOptions: options,
		});

		// Set parent after creation (will apply to mesh)
		if (parentGroup) {
			sps.parent = parentGroup;
		}

		// Create or load particle mesh
		const particleMesh = this._createOrLoadParticleMesh(name, config, vfxEmitter.materialId);
		if (!particleMesh) {
			return null;
		}

		// Initialize mesh in SPS
		sps.initializeMesh(particleMesh, capacity);

		// Apply behaviors
		if (config.behaviors && Array.isArray(config.behaviors) && config.behaviors.length > 0) {
			sps.behaviorConfigs.length = 0;
			sps.behaviorConfigs.push(...config.behaviors);
		}

		// Dispose temporary mesh
		particleMesh.dispose();

		this._logger.log(`SolidParticleSystem created: ${name}`, options);
		return sps;
	}

	/**
	 * Gets blend mode from material blending value
	 */
	private _getBlendModeFromMaterial(materialId: string): number | undefined {
		const { jsonData } = this._context;
		const material = jsonData.materials?.find((m: any) => m.uuid === materialId);

		if (material?.blending === undefined) {
			return undefined;
		}

		const blendModeMap: Record<number, number> = {
			0: Constants.ALPHA_DISABLE, // NoBlending
			1: Constants.ALPHA_COMBINE, // NormalBlending
			2: Constants.ALPHA_ADD, // AdditiveBlending
		};

		return blendModeMap[material.blending];
	}

	/**
	 * Creates or loads particle mesh for SPS
	 */
	private _createOrLoadParticleMesh(name: string, config: VFXParticleEmitterConfig, materialId: string | undefined): Nullable<Mesh> {
		const { scene, options } = this._context;
		let particleMesh = this._loadParticleGeometry(config, materialId, name);

		if (!particleMesh) {
			particleMesh = this._createDefaultPlaneMesh(name, scene);
			this._applyMaterialToMesh(particleMesh, materialId, name);
		} else {
			this._ensureMaterialApplied(particleMesh, materialId, name);
		}

		if (!particleMesh) {
			this._logger.warn(`  Cannot add shape to SPS: particleMesh is null`, options);
		}

		return particleMesh;
	}

	/**
	 * Loads particle geometry if specified
	 */
	private _loadParticleGeometry(config: VFXParticleEmitterConfig, materialId: string | undefined, name: string): Nullable<Mesh> {
		const { options } = this._context;

		if (!config.instancingGeometry) {
			return null;
		}

		this._logger.log(`  Loading geometry: ${config.instancingGeometry}`, options);
		const mesh = this._geometryFactory.createMesh(config.instancingGeometry, materialId, name + "_shape");
		if (!mesh) {
			this._logger.warn(`  Failed to load geometry ${config.instancingGeometry}, will create default plane`, options);
		}

		return mesh;
	}

	/**
	 * Creates default plane mesh
	 */
	private _createDefaultPlaneMesh(name: string, scene: any): Mesh {
		const { options } = this._context;
		this._logger.log(`  Creating default plane geometry`, options);
		return CreatePlane(name + "_shape", { width: 1, height: 1 }, scene);
	}

	/**
	 * Applies material to mesh
	 */
	private _applyMaterialToMesh(mesh: Mesh | null, materialId: string | undefined, name: string): void {
		if (!mesh || !materialId) {
			return;
		}

		const material = this._materialFactory.createMaterial(materialId, name);
		if (material) {
			mesh.material = material;
		}
	}

	/**
	 * Ensures material is applied to mesh if missing
	 */
	private _ensureMaterialApplied(mesh: Mesh, materialId: string | undefined, name: string): void {
		if (materialId && !mesh.material) {
			this._applyMaterialToMesh(mesh, materialId, name);
		}
	}

	/**
	 * Extracts rotation matrix from Three.js matrix array
	 */
	private _extractRotationMatrix(matrix: number[] | undefined): Matrix | null {
		if (!matrix || matrix.length < 16) {
			return null;
		}

		const mat = Matrix.FromArray(matrix);
		mat.transpose();
		return mat.getRotationMatrix();
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

	// Logging helpers
	private _getIndent(depth: number): string {
		return "  ".repeat(depth);
	}

	private _logInfo(message: string): void {
		this._logger.log(message, this._context.options);
	}

	private _logWarning(message: string): void {
		this._logger.warn(message, this._context.options);
	}

	private _logObjectProcessing(name: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Processing object: ${name}`, this._context.options);
	}

	private _logGroupCreation(name: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Created group node: ${name}`, this._context.options);
	}

	private _logChildrenProcessing(count: number, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Processing ${count} children`, this._context.options);
	}

	private _logEmitterProcessing(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number): void {
		const indent = this._getIndent(depth);
		const parentName = parentGroup ? parentGroup.name : "none";
		this._logger.log(`${indent}Processing emitter: ${vfxEmitter.name} (parent: ${parentName})`, this._context.options);
	}

	private _logEmitterConfig(vfxEmitter: VFXEmitter, depth: number): void {
		const indent = this._getIndent(depth);
		const config = vfxEmitter.config;
		this._logger.log(`${indent}  Config: duration=${config.duration}, looping=${config.looping}, systemType=${vfxEmitter.systemType}`, this._context.options);
	}

	private _logParticleSystemCreation(name: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Created particle system: ${name}`, this._context.options);
	}

	private _logCumulativeScale(scale: Vector3, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Cumulative scale: (${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`, this._context.options);
	}

	/**
	 * Apply transform to a node
	 */
	private _applyTransform(node: TransformNode, transform: VFXTransform, depth: number): void {
		if (!transform) {
			this._logWarning(`Transform is undefined for node: ${node.name}`);
			return;
		}

		const indent = this._getIndent(depth);

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
			this._logger.log(
				`${indent}Applied transform: pos=(${transform.position.x.toFixed(2)}, ${transform.position.y.toFixed(2)}, ${transform.position.z.toFixed(2)}), scale=(${transform.scale.x.toFixed(2)}, ${transform.scale.y.toFixed(2)}, ${transform.scale.z.toFixed(2)})`,
				this._context.options
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
			const indent = this._getIndent(depth);
			this._logger.log(`${indent}Set parent: ${node.name || "unknown"} -> ${parent.name}`, this._context.options);
		} else {
			const indent = this._getIndent(depth);
			this._logger.warn(`${indent}Node does not support setParent: ${node.constructor?.name || "unknown"}`, this._context.options);
		}
	}
}
