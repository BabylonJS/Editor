import { Nullable, Vector3, TransformNode } from "babylonjs";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import type { VFXParseContext } from "../types/context";
import type { VFXEmitterData } from "../types/emitter";
import type { VFXHierarchy, VFXGroup, VFXEmitter, VFXTransform } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import type { IVFXEmitterFactory } from "../types/factories";

/**
 * Processor for Three.js object hierarchy (Groups and ParticleEmitters)
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class VFXHierarchyProcessor {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _emitterFactory: IVFXEmitterFactory;

	constructor(context: VFXParseContext, emitterFactory: IVFXEmitterFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXHierarchyProcessor]");
		this._emitterFactory = emitterFactory;
	}

	/**
	 * Process the VFX hierarchy and create particle systems
	 * Creates all nodes, sets parents, and applies transformations in one pass
	 */
	public processHierarchy(vfxData: VFXHierarchy): (VFXParticleSystem | VFXSolidParticleSystem)[] {
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
		vfxData: VFXHierarchy
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
		vfxData: VFXHierarchy
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
		vfxData: VFXHierarchy
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
	 * Create a Group (TransformNode) from VFX Group data
	 * Creates node, sets parent, and applies transform in one go
	 */
	private _createGroupNode(vfxGroup: VFXGroup, parentGroup: Nullable<TransformNode>, depth: number): TransformNode {
		const { scene } = this._context;
		this._logGroupCreation(vfxGroup.name, depth);

		const groupNode = this._instantiateGroupNode(vfxGroup.name, scene);
		this._setGroupParent(groupNode, parentGroup, depth);
		this._applyGroupTransform(groupNode, vfxGroup.transform, depth);
		this._storeGroupNode(vfxGroup.uuid, groupNode, depth);

		return groupNode;
	}

	/**
	 * Instantiate a new TransformNode for a group
	 */
	private _instantiateGroupNode(name: string, scene: any): TransformNode {
		const groupNode = new TransformNode(name, scene);
		groupNode.isVisible = false;
		return groupNode;
	}

	/**
	 * Set parent for a group node
	 */
	private _setGroupParent(groupNode: TransformNode, parentGroup: Nullable<TransformNode>, depth: number): void {
		if (!parentGroup) {
			return;
		}

		groupNode.setParent(parentGroup);
		this._logGroupParentSet(parentGroup.name, depth);
	}

	/**
	 * Apply transform to a group node
	 */
	private _applyGroupTransform(groupNode: TransformNode, transform: VFXTransform, depth: number): void {
		this._logTransformApplication(groupNode.name, depth);
		this._applyTransform(groupNode, transform);
		this._logTransformDetails(groupNode, depth);
	}

	/**
	 * Apply transform to a node (position, rotation, scale)
	 */
	private _applyTransform(node: TransformNode, transform: VFXTransform): void {
		node.position.copyFrom(transform.position);
		node.rotationQuaternion = transform.rotation.clone();
		node.scaling.copyFrom(transform.scale);
	}

	/**
	 * Store group node in context map
	 */
	private _storeGroupNode(uuid: string, groupNode: TransformNode, depth: number): void {
		this._context.groupNodesMap.set(uuid, groupNode);
		this._logGroupStored(uuid, depth);
	}

	/**
	 * Create a particle system from VFX Emitter data
	 */
	private _createParticleSystem(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number): Nullable<VFXParticleSystem | VFXSolidParticleSystem> {
		this._logEmitterProcessing(vfxEmitter, parentGroup, depth);
		this._logEmitterConfig(vfxEmitter, depth);

		const emitterData = this._buildEmitterData(vfxEmitter, parentGroup, depth);
		const particleSystem = this._emitterFactory.createEmitter(emitterData) as VFXParticleSystem | VFXSolidParticleSystem | null;

		if (!particleSystem) {
			this._logEmitterCreationFailed(vfxEmitter.name, depth);
			return null;
		}

		this._logEmitterCreated(depth);
		this._handlePrewarm(particleSystem, vfxEmitter.config.prewarm);

		return particleSystem;
	}

	/**
	 * Build emitter data from VFX emitter and parent group
	 */
	private _buildEmitterData(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number): VFXEmitterData {
		const cumulativeScale = this._calculateCumulativeScale(parentGroup);
		this._logCumulativeScale(cumulativeScale, depth);

		return {
			name: vfxEmitter.name,
			config: vfxEmitter.config,
			materialId: vfxEmitter.materialId,
			parentGroup,
			cumulativeScale,
			vfxEmitter,
		};
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

	private _logObjectProcessing(objectName: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Processing object: ${objectName}`, this._context.options);
	}

	private _logChildrenProcessing(childrenCount: number, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Processing ${childrenCount} children`, this._context.options);
	}

	private _logGroupCreation(groupName: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Creating Group: ${groupName}`, this._context.options);
	}

	private _logGroupParentSet(parentName: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Group parent set: ${parentName}`, this._context.options);
	}

	private _logTransformApplication(nodeName: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Applying transform to group: ${nodeName}`, this._context.options);
	}

	private _logTransformDetails(node: TransformNode, depth: number): void {
		const indent = this._getIndent(depth);
		const pos = node.position;
		const rot = node.rotationQuaternion;
		const scl = node.scaling;

		this._logger.log(`${indent}Group position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`, this._context.options);
		if (rot) {
			this._logger.log(`${indent}Group rotation quaternion: (${rot.x.toFixed(4)}, ${rot.y.toFixed(4)}, ${rot.z.toFixed(4)}, ${rot.w.toFixed(4)})`, this._context.options);
		}
		this._logger.log(`${indent}Group scale: (${scl.x.toFixed(2)}, ${scl.y.toFixed(2)}, ${scl.z.toFixed(2)})`, this._context.options);
	}

	private _logGroupStored(uuid: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Group stored in map: ${uuid}`, this._context.options);
	}

	private _logEmitterProcessing(vfxEmitter: VFXEmitter, parentGroup: Nullable<TransformNode>, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}=== Processing ParticleEmitter: ${vfxEmitter.name} ===`, this._context.options);
		this._logger.log(`${indent}Current parent group: ${parentGroup ? parentGroup.name : "none"}`, this._context.options);
	}

	private _logEmitterConfig(vfxEmitter: VFXEmitter, depth: number): void {
		const { options } = this._context;
		if (!options?.verbose) {
			return;
		}

		const indent = this._getIndent(depth);
		const config = {
			renderMode: vfxEmitter.config.renderMode,
			duration: vfxEmitter.config.duration,
			looping: vfxEmitter.config.looping,
			prewarm: vfxEmitter.config.prewarm,
			emissionOverTime: vfxEmitter.config.emissionOverTime,
			startLife: vfxEmitter.config.startLife,
			startSpeed: vfxEmitter.config.startSpeed,
			startSize: vfxEmitter.config.startSize,
			behaviorsCount: vfxEmitter.config.behaviors?.length || 0,
			worldSpace: vfxEmitter.config.worldSpace,
		};

		this._logger.log(`${indent}Emitter config: ${JSON.stringify(config, null, 2)}`, options);
	}

	private _logCumulativeScale(scale: Vector3, depth: number): void {
		const { options } = this._context;
		if (!options?.verbose) {
			return;
		}

		if (scale.x === 1 && scale.y === 1 && scale.z === 1) {
			return;
		}

		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Cumulative scale from parent groups: (${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`, options);
	}

	private _logEmitterCreated(depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.log(`${indent}Particle system created successfully`, this._context.options);
	}

	private _logEmitterCreationFailed(emitterName: string, depth: number): void {
		const indent = this._getIndent(depth);
		this._logger.warn(`${indent}Failed to create particle system for ${emitterName}`, this._context.options);
	}
}
