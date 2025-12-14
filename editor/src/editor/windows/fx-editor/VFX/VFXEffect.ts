import { Scene, Tools, IDisposable, TransformNode } from "babylonjs";
import type { QuarksVFXJSON } from "./types/quarksTypes";
import type { VFXLoaderOptions } from "./types/loader";
import { VFXParser } from "./parsers/VFXParser";
import { VFXParticleSystem } from "./systems/VFXParticleSystem";
import { VFXSolidParticleSystem } from "./systems/VFXSolidParticleSystem";
import type { VFXGroup, VFXEmitter, VFXData } from "./types/hierarchy";
import { isVFXSystem } from "./types/system";

/**
 * VFX Effect Node - represents either a particle system or a group
 */
export interface VFXEffectNode {
	/** Node name */
	name: string;
	/** Node UUID from original JSON */
	uuid?: string;
	/** Particle system (if this is a particle emitter) */
	system?: VFXParticleSystem | VFXSolidParticleSystem;
	/** Transform node (if this is a group) */
	group?: TransformNode;
	/** Parent node */
	parent?: VFXEffectNode;
	/** Child nodes */
	children: VFXEffectNode[];
	/** Node type */
	type: "particle" | "group";
}

/**
 * VFX Effect containing multiple particle systems with hierarchy support
 * Main entry point for loading and creating VFX from Three.js particle JSON files
 */
export class VFXEffect implements IDisposable {
	/** All particle systems in this effect */
	private _systems: (VFXParticleSystem | VFXSolidParticleSystem)[] = [];

	/** Root node of the effect hierarchy */
	private _root: VFXEffectNode | null = null;

	/**
	 * Get all particle systems in this effect
	 */
	public get systems(): ReadonlyArray<VFXParticleSystem | VFXSolidParticleSystem> {
		return this._systems;
	}

	/**
	 * Get root node of the effect hierarchy
	 */
	public get root(): VFXEffectNode | null {
		return this._root;
	}

	/** Map of systems by name for quick lookup */
	private readonly _systemsByName = new Map<string, VFXParticleSystem | VFXSolidParticleSystem>();

	/** Map of systems by UUID for quick lookup */
	private readonly _systemsByUuid = new Map<string, VFXParticleSystem | VFXSolidParticleSystem>();

	/** Map of groups by name */
	private readonly _groupsByName = new Map<string, TransformNode>();

	/** Map of groups by UUID */
	private readonly _groupsByUuid = new Map<string, TransformNode>();

	/** All nodes in the hierarchy */
	private readonly _nodes = new Map<string, VFXEffectNode>();

	/**
	 * Load a Three.js particle JSON file and create particle systems
	 * @param url URL to the JSON file
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 * @returns Promise that resolves to a VFXEffect
	 */
	public static async LoadAsync(url: string, scene: Scene, rootUrl: string = "", options?: VFXLoaderOptions): Promise<VFXEffect> {
		return new Promise((resolve, reject) => {
			Tools.LoadFile(
				url,
				(data) => {
					try {
						const jsonData = JSON.parse(data.toString());
						const effect = VFXEffect.Parse(jsonData, scene, rootUrl, options);
						resolve(effect);
					} catch (error) {
						reject(error);
					}
				},
				undefined,
				undefined,
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
	}

	/**
	 * Parse a Three.js particle JSON file and create Babylon.js particle systems
	 * @param jsonData The Three.js JSON data
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 * @returns A VFXEffect containing all particle systems
	 */
	public static Parse(jsonData: QuarksVFXJSON, scene: Scene, rootUrl: string = "", options?: VFXLoaderOptions): VFXEffect {
		return new VFXEffect(jsonData, scene, rootUrl, options);
	}

	/**
	 * Create a VFXEffect directly from JSON data
	 * @param jsonData The Three.js JSON data
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 */
	constructor(jsonData?: QuarksVFXJSON, scene?: Scene, rootUrl: string = "", options?: VFXLoaderOptions) {
		if (jsonData && scene) {
			const parser = new VFXParser(scene, rootUrl, jsonData, options);
			const parseResult = parser.parse();

			this._systems.push(...parseResult.systems);
			if (parseResult.vfxData && parseResult.groupNodesMap) {
				this._buildHierarchy(parseResult.vfxData, parseResult.groupNodesMap, parseResult.systems);
			}
		}
	}

	/**
	 * Build hierarchy from VFX data and group nodes map
	 * Handles errors gracefully and continues building partial hierarchy if errors occur
	 */
	private _buildHierarchy(vfxData: VFXData, groupNodesMap: Map<string, TransformNode>, systems: (VFXParticleSystem | VFXSolidParticleSystem)[]): void {
		if (!vfxData || !vfxData.root) {
			return;
		}

		try {
			// Create nodes from hierarchy
			this._root = this._buildNodeFromHierarchy(vfxData.root, null, groupNodesMap, systems);
		} catch (error) {
			// Log error but don't throw - effect can still work with partial hierarchy
			console.error(`Failed to build VFX hierarchy: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Recursively build nodes from hierarchy
	 */
	private _buildNodeFromHierarchy(
		obj: VFXGroup | VFXEmitter,
		parent: VFXEffectNode | null,
		groupNodesMap: Map<string, TransformNode>,
		systems: (VFXParticleSystem | VFXSolidParticleSystem)[]
	): VFXEffectNode | null {
		if (!obj) {
			return null;
		}

		try {
			const node: VFXEffectNode = {
				name: obj.name,
				uuid: obj.uuid,
				parent: parent || undefined,
				children: [],
				type: "config" in obj ? "particle" : "group",
			};

			if (node.type === "particle") {
				// Find system by name
				const emitter = obj as VFXEmitter;
				const system = systems.find((s) => s.name === emitter.name);
				if (system) {
					node.system = system;
					this._systemsByName.set(emitter.name, system);
					if (emitter.uuid) {
						this._systemsByUuid.set(emitter.uuid, system);
					}
				}
			} else {
				// Find group TransformNode
				const group = obj as VFXGroup;
				const groupNode = group.uuid ? groupNodesMap.get(group.uuid) : null;
				if (groupNode) {
					node.group = groupNode;
					this._groupsByName.set(group.name, groupNode);
					if (group.uuid) {
						this._groupsByUuid.set(group.uuid, groupNode);
					}
				}
			}

			// Process children with error handling
			if ("children" in obj && obj.children) {
				for (const child of obj.children) {
					try {
						const childNode = this._buildNodeFromHierarchy(child, node, groupNodesMap, systems);
						if (childNode) {
							node.children.push(childNode);
						}
					} catch (error) {
						// Log error but continue processing other children
						console.warn(`Failed to build child node ${child.name}: ${error instanceof Error ? error.message : String(error)}`);
					}
				}
			}

			// Store node
			if (obj.uuid) {
				this._nodes.set(obj.uuid, node);
			}
			this._nodes.set(obj.name, node);

			return node;
		} catch (error) {
			// Log error but return null to continue building other parts of hierarchy
			console.error(`Failed to build node ${obj.name}: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	/**
	 * Find a particle system by name
	 */
	public findSystemByName(name: string): VFXParticleSystem | VFXSolidParticleSystem | null {
		return this._systemsByName.get(name) || null;
	}

	/**
	 * Find a particle system by UUID
	 */
	public findSystemByUuid(uuid: string): VFXParticleSystem | VFXSolidParticleSystem | null {
		return this._systemsByUuid.get(uuid) || null;
	}

	/**
	 * Find a group by name
	 */
	public findGroupByName(name: string): TransformNode | null {
		return this._groupsByName.get(name) || null;
	}

	/**
	 * Find a group by UUID
	 */
	public findGroupByUuid(uuid: string): TransformNode | null {
		return this._groupsByUuid.get(uuid) || null;
	}

	/**
	 * Find a node (system or group) by name
	 */
	public findNodeByName(name: string): VFXEffectNode | null {
		return this._nodes.get(name) || null;
	}

	/**
	 * Find a node (system or group) by UUID
	 */
	public findNodeByUuid(uuid: string): VFXEffectNode | null {
		return this._nodes.get(uuid) || null;
	}

	/**
	 * Get all systems in a group (recursively)
	 * Includes systems from nested child groups as well.
	 * Example: If Group1 contains Group2, and Group2 contains System1,
	 * then getSystemsInGroup("Group1") will return System1.
	 */
	public getSystemsInGroup(groupName: string): (VFXParticleSystem | VFXSolidParticleSystem)[] {
		const group = this.findGroupByName(groupName);
		if (!group) {
			return [];
		}

		const systems: (VFXParticleSystem | VFXSolidParticleSystem)[] = [];
		this._collectSystemsInGroup(group, systems);
		return systems;
	}

	/**
	 * Recursively collect systems in a group (including systems from all nested child groups)
	 * This method:
	 * 1. Collects all systems that have this group as direct parent
	 * 2. Recursively processes all child groups and collects their systems too
	 */
	private _collectSystemsInGroup(group: TransformNode, systems: (VFXParticleSystem | VFXSolidParticleSystem)[]): void {
		// Step 1: Find systems that have this group as direct parent
		for (const system of this._systems) {
			if (isVFXSystem(system)) {
				const parentNode = system.getParentNode();
				if (parentNode && parentNode.parent === group) {
					systems.push(system);
				}
			}
		}

		// Step 2: Recursively process all child groups
		// This ensures systems from nested groups are also collected
		for (const [, groupNode] of this._groupsByUuid) {
			if (groupNode.parent === group) {
				// Recursively collect systems from child group (and its nested groups)
				this._collectSystemsInGroup(groupNode, systems);
			}
		}
	}

	/**
	 * Start a specific system by name
	 */
	public startSystem(name: string): boolean {
		const system = this.findSystemByName(name);
		if (system) {
			system.start();
			return true;
		}
		return false;
	}

	/**
	 * Stop a specific system by name
	 */
	public stopSystem(name: string): boolean {
		const system = this.findSystemByName(name);
		if (system) {
			system.stop();
			return true;
		}
		return false;
	}

	/**
	 * Start all systems in a group
	 */
	public startGroup(groupName: string): void {
		const systems = this.getSystemsInGroup(groupName);
		for (const system of systems) {
			system.start();
		}
	}

	/**
	 * Stop all systems in a group
	 */
	public stopGroup(groupName: string): void {
		const systems = this.getSystemsInGroup(groupName);
		for (const system of systems) {
			system.stop();
		}
	}

	/**
	 * Start all particle systems
	 */
	public start(): void {
		for (const system of this._systems) {
			system.start();
		}
	}

	/**
	 * Stop all particle systems
	 */
	public stop(): void {
		for (const system of this._systems) {
			system.stop();
		}
	}

	/**
	 * Reset all particle systems (stop and clear particles)
	 */
	public reset(): void {
		for (const system of this._systems) {
			system.reset();
		}
	}

	/**
	 * Check if any system is started
	 */
	public isStarted(): boolean {
		for (const system of this._systems) {
			if (system instanceof VFXParticleSystem) {
				if ((system as any).isStarted && (system as any).isStarted()) {
					return true;
				}
			} else if (system instanceof VFXSolidParticleSystem) {
				// Check internal _started flag for SPS
				if ((system as any)._started && !(system as any)._stopped) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Dispose all resources
	 */
	public dispose(): void {
		for (const system of this._systems) {
			system.dispose();
		}
		this._systems = [];
		this._root = null;
		this._systemsByName.clear();
		this._systemsByUuid.clear();
		this._groupsByName.clear();
		this._groupsByUuid.clear();
		this._nodes.clear();
	}
}
