import { Scene, IDisposable, TransformNode, MeshBuilder, Texture, Color4, AbstractMesh, Tools } from "babylonjs";
import { EffectParticleSystem } from "./systems/effectParticleSystem";
import { EffectSolidParticleSystem } from "./systems/effectSolidParticleSystem";
import { IGroup, IEmitter, IData, isSystem, IEffectNode, ILoaderOptions, IParticleSystemConfig } from "./types";
import { NodeFactory } from "./factories";

/**
 *  Effect containing multiple particle systems with hierarchy support
 * Main entry point for loading and creating  from Three.js particle JSON files
 */
export class Effect implements IDisposable {
	/** Root node of the effect hierarchy */
	private _root: IEffectNode | null = null;

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

	/** Scene reference for creating new systems */
	private _scene: Scene | null = null;

	/**
	 * Create Effect from IData
	 *
	 *
	 * @param data IData structure (required)
	 * @param scene Babylon.js scene (required)
	 * @param rootUrl Root URL for loading textures (optional)
	 * @param options Optional parsing options
	 */
	constructor(data: IData, scene: Scene, rootUrl: string = "", options: ILoaderOptions) {
		if (!data || !scene) {
			throw new Error("Effect constructor requires IData and Scene");
		}

		this._scene = scene;
		const nodeFactory = new NodeFactory(scene, data, rootUrl, options);
		this._root = nodeFactory.create();
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
