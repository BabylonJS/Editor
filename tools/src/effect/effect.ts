import { IDisposable, Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { EffectParticleSystem, EffectSolidParticleSystem } from "./systems";
import { IData, IEffectNode, IParticleSystemConfig } from "./types";
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

	/** NodeFactory for creating groups and systems */
	private _nodeFactory: NodeFactory | null = null;

	/**
	 * Create Effect from IData
	 *
	 *
	 * @param data IData structure (required)
	 * @param scene Babylon.js scene (required)
	 * @param rootUrl Root URL for loading textures (optional)
	 */
	constructor(data: IData, scene: Scene, rootUrl: string = "") {
		if (!data || !scene) {
			throw new Error("Effect constructor requires IData and Scene");
		}

		this._nodeFactory = new NodeFactory(scene, data, rootUrl);
		this._root = this._nodeFactory.create();
	}

	/**
	 * Recursively find a node by name in the tree
	 */
	private _findNodeByName(node: IEffectNode | null, name: string): IEffectNode | null {
		if (!node) {
			return null;
		}
		if (node.name === name) {
			return node;
		}
		for (const child of node.children) {
			const found = this._findNodeByName(child, name);
			if (found) {
				return found;
			}
		}
		return null;
	}

	/**
	 * Recursively find a node by UUID in the tree
	 */
	private _findNodeByUuid(node: IEffectNode | null, uuid: string): IEffectNode | null {
		if (!node) {
			return null;
		}
		if (node.uuid === uuid) {
			return node;
		}
		for (const child of node.children) {
			const found = this._findNodeByUuid(child, uuid);
			if (found) {
				return found;
			}
		}
		return null;
	}

	/**
	 * Recursively collect all systems from the tree
	 */
	private _collectAllSystems(node: IEffectNode | null, systems: (EffectParticleSystem | EffectSolidParticleSystem)[]): void {
		if (!node) {
			return;
		}
		if (node.type === "particle") {
			const system = node.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system) {
				systems.push(system);
			}
		}
		for (const child of node.children) {
			this._collectAllSystems(child, systems);
		}
	}

	/**
	 * Find a particle system by name
	 */
	public findSystemByName(name: string): EffectParticleSystem | EffectSolidParticleSystem | null {
		const node = this._findNodeByName(this._root, name);
		if (node && node.type === "particle") {
			return node.data as EffectParticleSystem | EffectSolidParticleSystem;
		}
		return null;
	}

	/**
	 * Find a particle system by UUID
	 */
	public findSystemByUuid(uuid: string): EffectParticleSystem | EffectSolidParticleSystem | null {
		const node = this._findNodeByUuid(this._root, uuid);
		if (node && node.type === "particle") {
			return node.data as EffectParticleSystem | EffectSolidParticleSystem;
		}
		return null;
	}

	/**
	 * Find a group by name
	 */
	public findGroupByName(name: string): TransformNode | null {
		const node = this._findNodeByName(this._root, name);
		if (node && node.type === "group") {
			return node.data as TransformNode;
		}
		return null;
	}

	/**
	 * Find a group by UUID
	 */
	public findGroupByUuid(uuid: string): TransformNode | null {
		const node = this._findNodeByUuid(this._root, uuid);
		if (node && node.type === "group") {
			return node.data as TransformNode;
		}
		return null;
	}

	/**
	 * Find a node (system or group) by name
	 */
	public findNodeByName(name: string): IEffectNode | null {
		return this._findNodeByName(this._root, name);
	}

	/**
	 * Find a node (system or group) by UUID
	 */
	public findNodeByUuid(uuid: string): IEffectNode | null {
		return this._findNodeByUuid(this._root, uuid);
	}

	/**
	 * Get all systems in a group (recursively)
	 * Includes systems from nested child groups as well.
	 * Example: If Group1 contains Group2, and Group2 contains System1,
	 * then getSystemsInGroup("Group1") will return System1.
	 */
	public getSystemsInGroup(groupName: string): (EffectParticleSystem | EffectSolidParticleSystem)[] {
		const groupNode = this.findNodeByName(groupName);
		if (!groupNode || groupNode.type !== "group") {
			return [];
		}

		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectSystemsInGroupNode(groupNode, systems);
		return systems;
	}

	/**
	 * Recursively collect systems in a group node (including systems from all nested child groups)
	 */
	private _collectSystemsInGroupNode(groupNode: IEffectNode, systems: (EffectParticleSystem | EffectSolidParticleSystem)[]): void {
		if (groupNode.type === "particle") {
			const system = groupNode.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system) {
				systems.push(system);
			}
		}
		for (const child of groupNode.children) {
			this._collectSystemsInGroupNode(child, systems);
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
		if (node.type === "particle") {
			const system = node.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system && typeof system.start === "function") {
				system.start();
			}
		} else if (node.type === "group") {
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
		if (node.type === "particle") {
			const system = node.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system && typeof system.stop === "function") {
				system.stop();
			}
		} else if (node.type === "group") {
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
		if (node.type === "particle") {
			const system = node.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system && typeof system.reset === "function") {
				system.reset();
			}
		} else if (node.type === "group") {
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
		if (node.type === "particle") {
			const system = node.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system instanceof EffectParticleSystem) {
				return (system as any).isStarted ? (system as any).isStarted() : false;
			} else if (system instanceof EffectSolidParticleSystem) {
				return (system as any)._started && !(system as any)._stopped;
			}
			return false;
		} else if (node.type === "group") {
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

		if (node.type === "particle") {
			const system = node.data as EffectParticleSystem | EffectSolidParticleSystem;
			if (system) {
				systems.push(system);
			}
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
		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectAllSystems(this._root, systems);
		for (const system of systems) {
			system.start();
		}
	}

	/**
	 * Stop all particle systems
	 */
	public stop(): void {
		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectAllSystems(this._root, systems);
		for (const system of systems) {
			system.stop();
		}
	}

	/**
	 * Reset all particle systems (stop and clear particles)
	 */
	public reset(): void {
		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectAllSystems(this._root, systems);
		for (const system of systems) {
			system.reset();
		}
	}

	/**
	 * Check if any system is started
	 */
	public isStarted(): boolean {
		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectAllSystems(this._root, systems);
		for (const system of systems) {
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
		if (!this._nodeFactory) {
			console.error("Cannot create group: NodeFactory is not available");
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
		while (this._findNodeByName(this._root, uniqueName)) {
			uniqueName = `${name} ${counter}`;
			counter++;
		}

		// Create group using NodeFactory
		const newNode = this._nodeFactory.createGroup(uniqueName, parent);

		// Add to parent's children
		parent.children.push(newNode);

		return newNode;
	}

	/**
	 * Create a new particle system
	 * @param parentNode Parent node (if null, adds to root)
	 * @param systemType Type of system ("solid" or "base")
	 * @param name Optional name (defaults to "ParticleSystem")
	 * @param config Optional particle system config
	 * @returns Created particle system node
	 */
	public createParticleSystem(
		parentNode: IEffectNode | null = null,
		systemType: "solid" | "base" = "base",
		name: string = "ParticleSystem",
		config?: Partial<IParticleSystemConfig>
	): IEffectNode | null {
		if (!this._nodeFactory) {
			console.error("Cannot create particle system: NodeFactory is not available");
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
		while (this._findNodeByName(this._root, uniqueName)) {
			uniqueName = `${name} ${counter}`;
			counter++;
		}

		// Create particle system using NodeFactory
		const newNode = this._nodeFactory.createParticleSystem(uniqueName, systemType, config, parent);

		// Add to parent's children
		parent.children.push(newNode);

		return newNode;
	}

	/**
	 * Dispose all resources
	 */
	public dispose(): void {
		const systems: (EffectParticleSystem | EffectSolidParticleSystem)[] = [];
		this._collectAllSystems(this._root, systems);
		for (const system of systems) {
			system.dispose();
		}
		this._root = null;
	}
}
