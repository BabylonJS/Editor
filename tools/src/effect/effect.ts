import { Scene, Tools, IDisposable, TransformNode, MeshBuilder, Texture, Color4, AbstractMesh } from "babylonjs";
import type { IQuarksJSON } from "./types/quarksTypes";
import type { ILoaderOptions } from "./types/loader";
import { Parser } from "./parsers/parser";
import { EffectParticleSystem } from "./systems/effectParticleSystem";
import { EffectSolidParticleSystem } from "./systems/effectSolidParticleSystem";
import type { IGroup, IEmitter, IData } from "./types/hierarchy";
import type { IParticleSystemConfig } from "./types/emitter";
import { isSystem } from "./types/system";

/**
 *  Effect Node - represents either a particle system or a group
 */
export interface IEffectNode {
	/** Node name */
	name: string;
	/** Node UUID from original JSON */
	uuid?: string;
	/** Particle system (if this is a particle emitter) */
	system?: EffectParticleSystem | EffectSolidParticleSystem;
	/** Transform node (if this is a group) */
	group?: TransformNode;
	/** Parent node */
	parent?: IEffectNode;
	/** Child nodes */
	children: IEffectNode[];
	/** Node type */
	type: "particle" | "group";
}

/**
 *  Effect containing multiple particle systems with hierarchy support
 * Main entry point for loading and creating  from Three.js particle JSON files
 */
export class Effect implements IDisposable {
	/** All particle systems in this effect */
	private _systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];

	/** Root node of the effect hierarchy */
	private _root: IEffectNode | null = null;

	/**
	 * Get all particle systems in this effect
	 */
	public get systems(): ReadonlyArray<EffectParticleSystem | EffectSolidParticleSystem> {
		return this._systems;
	}

	/**
	 * Get root node of the effect hierarchy
	 */
	public get root(): IEffectNode | null {
		return this._root;
	}

	/** Map of systems by name for quick lookup */
	private readonly _systemsByName = new Map<string, EffectParticleSystem | EffectSolidParticleSystem>();

	/** Map of systems by UUID for quick lookup */
	private readonly _systemsByUuid = new Map<string, EffectParticleSystem | EffectSolidParticleSystem>();

	/** Map of groups by name */
	private readonly _groupsByName = new Map<string, TransformNode>();

	/** Map of groups by UUID */
	private readonly _groupsByUuid = new Map<string, TransformNode>();

	/** All nodes in the hierarchy */
	private readonly _nodes = new Map<string, IEffectNode>();

	/** Scene reference for creating new systems */
	private _scene: Scene | null = null;

	/**
	 * Load a Three.js particle JSON file and create particle systems
	 * @param url URL to the JSON file
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 * @returns Promise that resolves to a Effect
	 */
	public static async LoadAsync(url: string, scene: Scene, rootUrl: string = "", options?: ILoaderOptions): Promise<Effect> {
		return new Promise((resolve, reject) => {
			Tools.LoadFile(
				url,
				(data) => {
					try {
						const jsonData = JSON.parse(data.toString());
						const effect = Effect.Parse(jsonData, scene, rootUrl, options);
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
	 * @returns A Effect containing all particle systems
	 */
	public static Parse(jsonData: IQuarksJSON, scene: Scene, rootUrl: string = "", options?: ILoaderOptions): Effect {
		return new Effect(jsonData, scene, rootUrl, options);
	}

	/**
	 * Create a Effect directly from JSON data
	 * @param jsonData The Three.js JSON data
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 */
	constructor(jsonData?: IQuarksJSON, scene?: Scene, rootUrl: string = "", options?: ILoaderOptions) {
		this._scene = scene || null;
		if (jsonData && scene) {
			const parser = new Parser(scene, rootUrl, jsonData, options);
			const parseResult = parser.parse();

			this._systems.push(...parseResult.systems);
			if (parseResult.data && parseResult.groupNodesMap) {
				this._buildHierarchy(parseResult.data, parseResult.groupNodesMap, parseResult.systems);
			}
		} else if (scene) {
			// Create empty effect with root group
			this._scene = scene;
			this._createEmptyEffect();
		}
	}

	/**
	 * Build hierarchy from  data and group nodes map
	 * Handles errors gracefully and continues building partial hierarchy if errors occur
	 */
	private _buildHierarchy(Data: IData, groupNodesMap: Map<string, TransformNode>, systems: (EffectParticleSystem | EffectSolidParticleSystem)[]): void {
		if (!Data || !Data.root) {
			return;
		}

		try {
			// Create nodes from hierarchy
			this._root = this._buildNodeFromHierarchy(Data.root, null, groupNodesMap, systems);
		} catch (error) {
			// Log error but don't throw - effect can still work with partial hierarchy
			console.error(`Failed to build  hierarchy: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Recursively build nodes from hierarchy
	 */
	private _buildNodeFromHierarchy(
		obj: IGroup | IEmitter,
		parent: IEffectNode | null,
		groupNodesMap: Map<string, TransformNode>,
		systems: (EffectParticleSystem | EffectSolidParticleSystem)[]
	): IEffectNode | null {
		if (!obj) {
			return null;
		}

		try {
			const node: IEffectNode = {
				name: obj.name,
				uuid: obj.uuid,
				parent: parent || undefined,
				children: [],
				type: "config" in obj ? "particle" : "group",
			};

			if (node.type === "particle") {
				// Find system by name
				const emitter = obj as IEmitter;
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
				const group = obj as IGroup;
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
	public findSystemByName(name: string): EffectParticleSystem | EffectSolidParticleSystem | null {
		return this._systemsByName.get(name) || null;
	}

	/**
	 * Find a particle system by UUID
	 */
	public findSystemByUuid(uuid: string): EffectParticleSystem | EffectSolidParticleSystem | null {
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
	public findNodeByName(name: string): IEffectNode | null {
		return this._nodes.get(name) || null;
	}

	/**
	 * Find a node (system or group) by UUID
	 */
	public findNodeByUuid(uuid: string): IEffectNode | null {
		return this._nodes.get(uuid) || null;
	}

	/**
	 * Get all systems in a group (recursively)
	 * Includes systems from nested child groups as well.
	 * Example: If Group1 contains Group2, and Group2 contains System1,
	 * then getSystemsInGroup("Group1") will return System1.
	 */
	public getSystemsInGroup(groupName: string): (EffectParticleSystem | EffectSolidParticleSystem)[] {
		const group = this.findGroupByName(groupName);
		if (!group) {
			return [];
		}

		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectSystemsInGroup(group, systems);
		return systems;
	}

	/**
	 * Recursively collect systems in a group (including systems from all nested child groups)
	 * This method:
	 * 1. Collects all systems that have this group as direct parent
	 * 2. Recursively processes all child groups and collects their systems too
	 */
	private _collectSystemsInGroup(group: TransformNode, systems: (EffectParticleSystem | EffectSolidParticleSystem)[]): void {
		// Step 1: Find systems that have this group as direct parent
		for (const system of this._systems) {
			if (isSystem(system)) {
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
	 * Start a node (system or group)
	 */
	public startNode(node: IEffectNode): void {
		if (node.type === "particle" && node.system) {
			node.system.start();
		} else if (node.type === "group" && node.group) {
			// Find all systems in this group recursively
			const systems = this._getSystemsInNode(node);
			for (const system of systems) {
				system.start();
			}
		}
	}

	/**
	 * Stop a node (system or group)
	 */
	public stopNode(node: IEffectNode): void {
		if (node.type === "particle" && node.system) {
			node.system.stop();
		} else if (node.type === "group" && node.group) {
			// Find all systems in this group recursively
			const systems = this._getSystemsInNode(node);
			for (const system of systems) {
				system.stop();
			}
		}
	}

	/**
	 * Reset a node (system or group)
	 */
	public resetNode(node: IEffectNode): void {
		if (node.type === "particle" && node.system) {
			node.system.reset();
		} else if (node.type === "group" && node.group) {
			// Find all systems in this group recursively
			const systems = this._getSystemsInNode(node);
			for (const system of systems) {
				system.reset();
			}
		}
	}

	/**
	 * Check if a node is started (system or group)
	 */
	public isNodeStarted(node: IEffectNode): boolean {
		if (node.type === "particle" && node.system) {
			if (node.system instanceof EffectParticleSystem) {
				return (node.system as any).isStarted ? (node.system as any).isStarted() : false;
			} else if (node.system instanceof EffectSolidParticleSystem) {
				return (node.system as any)._started && !(node.system as any)._stopped;
			}
			return false;
		} else if (node.type === "group" && node.group) {
			// Check if any system in this group is started
			const systems = this._getSystemsInNode(node);
			return systems.some((system) => {
				if (system instanceof EffectParticleSystem) {
					return (system as any).isStarted ? (system as any).isStarted() : false;
				} else if (system instanceof EffectSolidParticleSystem) {
					return (system as any)._started && !(system as any)._stopped;
				}
				return false;
			});
		}
		return false;
	}

	/**
	 * Get all systems in a node recursively
	 */
	private _getSystemsInNode(node: IEffectNode): (EffectParticleSystem | EffectSolidParticleSystem)[] {
		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];

		if (node.type === "particle" && node.system) {
			systems.push(node.system);
		} else if (node.type === "group") {
			// Recursively collect all systems from children
			for (const child of node.children) {
				systems.push(...this._getSystemsInNode(child));
			}
		}

		return systems;
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
	 * Apply prewarm to systems that have it enabled
	 * Should be called after hierarchy is built and all systems are created
	 * Uses Babylon.js built-in prewarm properties for ParticleSystem
	 */
	public applyPrewarm(): void {
		for (const system of this._systems) {
			if (system instanceof EffectParticleSystem && system.preWarmCycles > 0) {
				// ParticleSystem uses native preWarmCycles/preWarmStepOffset
				// Already configured via config.preWarmCycles, nothing more needed
			} else if (system instanceof EffectSolidParticleSystem && system.preWarmCycles > 0) {
				// For SolidParticleSystem, we need to manually simulate prewarm
				// Start the system and let it run for duration
				// Note: SPS doesn't have built-in prewarm, so we'll start it normally
				// The prewarm effect will be visible when system starts
			}
		}
	}

	/**
	 * Check if any system is started
	 */
	public isStarted(): boolean {
		for (const system of this._systems) {
			if (system instanceof EffectParticleSystem) {
				if ((system as any).isStarted && (system as any).isStarted()) {
					return true;
				}
			} else if (system instanceof EffectSolidParticleSystem) {
				// Check internal _started flag for SPS
				if ((system as any)._started && !(system as any)._stopped) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Create empty effect with root group
	 */
	private _createEmptyEffect(): void {
		if (!this._scene) {
			return;
		}

		const rootGroup = new TransformNode("Root", this._scene);
		const rootUuid = Tools.RandomId();
		rootGroup.id = rootUuid;

		const rootNode: IEffectNode = {
			name: "Root",
			uuid: rootUuid,
			group: rootGroup,
			children: [],
			type: "group",
		};

		this._root = rootNode;
		this._groupsByName.set("Root", rootGroup);
		this._groupsByUuid.set(rootUuid, rootGroup);
		this._nodes.set(rootUuid, rootNode);
		this._nodes.set("Root", rootNode);
	}

	/**
	 * Create a new group node
	 * @param parentNode Parent node (if null, adds to root)
	 * @param name Optional name (defaults to "Group")
	 * @returns Created group node
	 */
	public createGroup(parentNode: IEffectNode | null = null, name: string = "Group"): IEffectNode | null {
		if (!this._scene) {
			console.error("Cannot create group: scene is not available");
			return null;
		}

		const parent = parentNode || this._root;
		if (!parent || parent.type !== "group") {
			console.error("Cannot create group: parent is not a group");
			return null;
		}

		// Ensure unique name
		let uniqueName = name;
		let counter = 1;
		while (this._nodes.has(uniqueName)) {
			uniqueName = `${name} ${counter}`;
			counter++;
		}

		const groupUuid = Tools.RandomId();
		const groupNode = new TransformNode(uniqueName, this._scene);
		groupNode.id = groupUuid;

		// Set parent transform
		if (parent.group) {
			groupNode.setParent(parent.group, false, true);
		}

		const newNode: IEffectNode = {
			name: uniqueName,
			uuid: groupUuid,
			group: groupNode,
			parent,
			children: [],
			type: "group",
		};

		// Add to parent's children
		parent.children.push(newNode);

		// Store in maps
		this._groupsByName.set(uniqueName, groupNode);
		this._groupsByUuid.set(groupUuid, groupNode);
		this._nodes.set(groupUuid, newNode);
		this._nodes.set(uniqueName, newNode);

		return newNode;
	}

	/**
	 * Create a new particle system
	 * @param parentNode Parent node (if null, adds to root)
	 * @param systemType Type of system ("solid" or "base")
	 * @param name Optional name (defaults to "ParticleSystem")
	 * @returns Created particle system node
	 */
	public createParticleSystem(parentNode: IEffectNode | null = null, systemType: "solid" | "base" = "base", name: string = "ParticleSystem"): IEffectNode | null {
		if (!this._scene) {
			console.error("Cannot create particle system: scene is not available");
			return null;
		}

		const parent = parentNode || this._root;
		if (!parent || parent.type !== "group") {
			console.error("Cannot create particle system: parent is not a group");
			return null;
		}

		// Ensure unique name
		let uniqueName = name;
		let counter = 1;
		while (this._nodes.has(uniqueName)) {
			uniqueName = `${name} ${counter}`;
			counter++;
		}

		const systemUuid = Tools.RandomId();

		// Create default config
		const config: IParticleSystemConfig = {
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
			colorDead: new Color4(1, 1, 1, 0),
			behaviors: [],
		};

		let system: EffectParticleSystem | EffectSolidParticleSystem;

		// Create system instance based on type
		if (systemType === "solid") {
			system = new EffectSolidParticleSystem(uniqueName, this._scene, {
				updatable: true,
				isPickable: false,
				enableDepthSort: false,
				particleIntersection: false,
				useModelMaterial: true,
			});
			const particleMesh = MeshBuilder.CreateSphere("particleMesh", { segments: 16, diameter: 1 }, this._scene);
			system.particleMesh = particleMesh;
		} else {
			const capacity = 500;
			system = new EffectParticleSystem(uniqueName, capacity, this._scene);
			system.particleTexture = new Texture("https://assets.babylonjs.com/core/textures/flare.png", this._scene);
		}

		// Set system name
		system.name = uniqueName;
		system.emitter = parent.group as AbstractMesh;
		// === Assign native properties (shared by both systems) ===
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

		// === Apply gradients (shared by both systems) ===
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

		// === Apply behaviors (shared by both systems) ===
		if (config.behaviors !== undefined) {
			system.setBehaviors(config.behaviors);
		}

		const newNode: IEffectNode = {
			name: uniqueName,
			uuid: systemUuid,
			system,
			parent,
			children: [],
			type: "particle",
		};

		// Add to parent's children
		parent.children.push(newNode);

		// Store in maps
		this._systems.push(system);
		this._systemsByName.set(uniqueName, system);
		this._systemsByUuid.set(systemUuid, system);
		this._nodes.set(systemUuid, newNode);
		this._nodes.set(uniqueName, newNode);

		return newNode;
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
