import type { Nullable } from "@babylonjs/core/types";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import type { VFXParseContext } from "../types/context";
import type { VFXEmitterData } from "../types/emitter";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXHierarchy, VFXGroup, VFXEmitter, VFXTransform } from "../types/hierarchy";
import { VFXLogger } from "../loggers/VFXLogger";
import type { IVFXEmitterFactory } from "../types/factories";

/**
 * Processor for Three.js object hierarchy (Groups and ParticleEmitters)
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
	 * Uses pre-converted data (already in left-handed coordinate system)
	 */
	public processHierarchy(vfxData: VFXHierarchy): (VFXParticleSystem | VFXSolidParticleSystem)[] {
		const { options } = this._context;
		const particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[] = [];

		if (!vfxData.root) {
			this._logger.warn("No root object found in VFX data", options);
			return particleSystems;
		}

		this._logger.log("Phase 1: Creating nodes and building hierarchy", options);
		// Phase 1: Create all nodes without transformations, build hierarchy
		this._processVFXObject(vfxData.root, null, 0, particleSystems, false, vfxData);

		this._logger.log("Phase 2: Applying transformations", options);
		// Phase 2: Apply transformations after hierarchy is established
		this._processVFXObject(vfxData.root, null, 0, particleSystems, true, vfxData);

		return particleSystems;
	}

	/**
	 * Recursively process VFX object hierarchy
	 * @param applyTransformations If true, applies transformations. If false, creates nodes and builds hierarchy.
	 */
	private _processVFXObject(
		vfxObj: VFXGroup | VFXEmitter,
		parentGroup: Nullable<TransformNode>,
		depth: number,
		particleSystems: (VFXParticleSystem | VFXSolidParticleSystem)[],
		applyTransformations: boolean,
		vfxData: VFXHierarchy
	): void {
		const { options } = this._context;
		const indent = "  ".repeat(depth);

		if (!applyTransformations) {
			this._logger.log(`${indent}Creating object: ${vfxObj.name}`, options);
		} else {
			this._logger.log(`${indent}Applying transformations to: ${vfxObj.name}`, options);
		}

		let currentGroup: Nullable<TransformNode> = parentGroup;

		// Handle Group objects
		if ("children" in vfxObj) {
			const vfxGroup = vfxObj as VFXGroup;
			if (!applyTransformations) {
				// Phase 1: Create group without transformations, set parent
				currentGroup = this._createGroupFromVFX(vfxGroup, parentGroup, depth, options);
			} else {
				// Phase 2: Apply transformations to group
				currentGroup = this._context.groupNodesMap.get(vfxGroup.uuid) || null;
				if (currentGroup) {
					this._applyVFXTransformToGroup(currentGroup, vfxGroup.transform, depth, options);
				}
			}

			// Process children recursively
			if (vfxGroup.children && vfxGroup.children.length > 0) {
				if (!applyTransformations) {
					this._logger.log(`${indent}Processing ${vfxGroup.children.length} children`, options);
				}
				for (const child of vfxGroup.children) {
					this._processVFXObject(child, currentGroup, depth + 1, particleSystems, applyTransformations, vfxData);
				}
			}
		} else {
			// Handle Emitter objects
			const vfxEmitter = vfxObj as VFXEmitter;
			if (!applyTransformations) {
				// Phase 1: Create particle system without transformations
				const particleSystem = this._processVFXEmitter(vfxEmitter, currentGroup, depth, options, false);
				if (particleSystem) {
					particleSystems.push(particleSystem);
				}
			} else {
				// Phase 2: Apply transformations to particle system
				this._applyVFXTransformToEmitter(vfxEmitter, currentGroup, depth, options);
			}
		}
	}

	/**
	 * Create a Group (TransformNode) from VFX Group data
	 * Phase 1: Creates node without transformations, sets parent
	 */
	private _createGroupFromVFX(vfxGroup: VFXGroup, parentGroup: Nullable<TransformNode>, depth: number, options?: VFXLoaderOptions): TransformNode {
		const { scene } = this._context;
		const indent = "  ".repeat(depth);

		this._logger.log(`${indent}Creating Group: ${vfxGroup.name} (without transformations)`, options);
		const groupNode = new TransformNode(vfxGroup.name, scene);

		// Initialize with identity transform (will be applied in phase 2)
		groupNode.position.setAll(0);
		if (!groupNode.rotationQuaternion) {
			groupNode.rotationQuaternion = Quaternion.Identity();
		} else {
			groupNode.rotationQuaternion.set(0, 0, 0, 1);
		}
		groupNode.scaling.setAll(1);

		// Set visibility
		groupNode.isVisible = false;

		// Set parent FIRST (before applying transformations)
		if (parentGroup) {
			groupNode.setParent(parentGroup);
			this._logger.log(`${indent}Group parent set: ${parentGroup.name}`, options);
		}

		// Store in map for reference (needed for phase 2)
		this._context.groupNodesMap.set(vfxGroup.uuid, groupNode);
		this._logger.log(`${indent}Group stored in map: ${vfxGroup.uuid}`, options);

		return groupNode;
	}

	/**
	 * Apply VFX transform to a Group node
	 * Phase 2: Applies pre-converted transformations (already in left-handed system)
	 */
	private _applyVFXTransformToGroup(groupNode: TransformNode, transform: VFXTransform, depth: number, options?: VFXLoaderOptions): void {
		const indent = "  ".repeat(depth);
		this._logger.log(`${indent}Applying converted transform to group: ${groupNode.name}`, options);

		// Transform is already converted to left-handed, apply directly
		groupNode.position.copyFrom(transform.position);
		groupNode.rotationQuaternion = transform.rotation.clone();
		groupNode.scaling.copyFrom(transform.scale);

		const pos = groupNode.position;
		const rot = groupNode.rotationQuaternion;
		const scl = groupNode.scaling;
		this._logger.log(`${indent}Group position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`, options);
		if (rot) {
			this._logger.log(`${indent}Group rotation quaternion: (${rot.x.toFixed(4)}, ${rot.y.toFixed(4)}, ${rot.z.toFixed(4)}, ${rot.w.toFixed(4)})`, options);
		}
		this._logger.log(`${indent}Group scale: (${scl.x.toFixed(2)}, ${scl.y.toFixed(2)}, ${scl.z.toFixed(2)})`, options);
	}

	/**
	 * Process a VFX ParticleEmitter
	 * @param applyTransformations If false, creates system without transformations. If true, applies transformations.
	 */
	private _processVFXEmitter(
		vfxEmitter: VFXEmitter,
		currentGroup: Nullable<TransformNode>,
		depth: number,
		options?: VFXLoaderOptions,
		applyTransformations: boolean = false
	): Nullable<VFXParticleSystem | VFXSolidParticleSystem> {
		const indent = "  ".repeat(depth);
		const emitterName = vfxEmitter.name;

		this._logger.log(`${indent}=== Processing ParticleEmitter: ${emitterName} ===`, options);
		this._logger.log(`${indent}Current parent group: ${currentGroup ? currentGroup.name : "none"}`, options);

		// Log emitter configuration
		if (options?.verbose) {
			this._logger.log(
				`${indent}Emitter config: ${JSON.stringify(
					{
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
					},
					null,
					2
				)}`,
				options
			);
		}

		// Calculate cumulative scale from parent groups
		const cumulativeScale = this._calculateCumulativeScale(currentGroup);

		const emitterData: VFXEmitterData = {
			name: emitterName,
			config: vfxEmitter.config,
			materialId: vfxEmitter.materialId,
			// Transform is already converted, will be passed through emitterData
			matrix: undefined,
			position: undefined,
			parentGroup: currentGroup,
			cumulativeScale,
		};

		// Store VFX emitter data (including transform) in emitterData for use in factory
		emitterData.vfxEmitter = vfxEmitter;

		if (options?.verbose && (cumulativeScale.x !== 1 || cumulativeScale.y !== 1 || cumulativeScale.z !== 1)) {
			this._logger.log(
				`${indent}Cumulative scale from parent groups: (${cumulativeScale.x.toFixed(2)}, ${cumulativeScale.y.toFixed(2)}, ${cumulativeScale.z.toFixed(2)})`,
				options
			);
		}

		if (!applyTransformations) {
			// Phase 1: Create particle system without transformations
			const particleSystem = this._emitterFactory.createEmitter(emitterData);

			if (particleSystem) {
				this._logger.log(`${indent}Particle system created successfully (without transformations)`, options);

				// VFX emitter data is already stored in emitterData, no need to store in particle system

				// Handle prewarm
				if (vfxEmitter.config.prewarm) {
					particleSystem.start();
				}

				return particleSystem as VFXParticleSystem;
			} else {
				this._logger.warn(`${indent}Failed to create particle system for ${emitterName}`, options);
				return null;
			}
		} else {
			// Phase 2: Apply transformations (this will be handled separately)
			return null;
		}
	}

	/**
	 * Apply VFX transform to emitter (Phase 2)
	 * For SPS, transformations are applied in initParticles (after buildMesh)
	 * For ParticleSystem, we need to find and update the emitter mesh
	 */
	private _applyVFXTransformToEmitter(vfxEmitter: VFXEmitter, _currentGroup: Nullable<TransformNode>, depth: number, options?: VFXLoaderOptions): void {
		const indent = "  ".repeat(depth);
		const emitterName = vfxEmitter.name;

		// For SPS: transformations are applied in initParticles (called after buildMesh)
		// Transform is already stored in _vfxEmitter and will be applied there
		// For ParticleSystem: emitter is set during creation, but we need to apply transform if it's a mesh
		// Note: ParticleSystem emitter transformations are handled during creation phase
		// because emitter needs to be set before particle system starts
		this._logger.log(`${indent}Transformations for emitter ${emitterName} (will be applied in initParticles for SPS)`, options);
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
}
