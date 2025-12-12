import { Nullable, Vector3, TransformNode } from "babylonjs";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import type { VFXParseContext } from "../types/context";
import type { VFXEmitterData } from "../types/emitter";
import type { VFXData, VFXGroup, VFXEmitter, VFXTransform } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import type { IVFXEmitterFactory } from "../types/factories";

/**
 * Factory for creating particle systems from VFX data
 * Creates all nodes, sets parents, and applies transformations in a single pass
 */
export class VFXSystemFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _emitterFactory: IVFXEmitterFactory;

	constructor(context: VFXParseContext, emitterFactory: IVFXEmitterFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXSystemFactory]");
		this._emitterFactory = emitterFactory;
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

		const emitterData = this._buildEmitterData(vfxEmitter, parentGroup, depth);
		const particleSystem = this._emitterFactory.createEmitter(emitterData) as VFXParticleSystem | VFXSolidParticleSystem | null;

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
	 * Build emitter data structure for factory
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
