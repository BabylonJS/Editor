import { Constants } from "@babylonjs/core/Engines/constants";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import {
	BatchedRenderer,
	ConstantValue,
	ParticleEmitter,
	ParticleSystem,
	QuarksLoader,
	QuarksUtil,
	RenderMode,
	SphereEmitter,
	type Behavior,
	type ParticleSystemEvent,
} from "babylon.quarks";

export type QuarksNodeType = "group" | "particle";

export interface IQuarksNode {
	id: string;
	uuid: string;
	name: string;
	type: QuarksNodeType;
	data: TransformNode | ParticleSystem;
	children: IQuarksNode[];
}

export interface IQuarksEffectFile {
	version: string;
	effects: IQuarksSerializedEffect[];
}

export interface IQuarksSerializedEffect {
	id: string;
	name: string;
	data: {
		object: any;
		geometries: any[];
		materials: any[];
		textures: any[];
		images: any[];
	};
}

interface ISerializationMeta {
	geometries: Record<string, any>;
	materials: Record<string, any>;
	textures: Record<string, Texture | null>;
	images: Record<string, any>;
}

function createId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable id for tree/serialization; matches QuarksLoader `data.uuid` when present. */
export function getQuarksTransformUuid(node: TransformNode): string {
	return ((node as any)._quarksUUID as string) ?? node.uniqueId.toString();
}

function getNodeUuid(node: TransformNode): string {
	return getQuarksTransformUuid(node);
}

function setNodeUuid(node: TransformNode, uuid?: string): void {
	(node as any)._quarksUUID = uuid ?? getNodeUuid(node);
}

function makeNode(node: TransformNode): IQuarksNode {
	const isParticle = node instanceof ParticleEmitter;
	const stableId = getNodeUuid(node);
	return {
		id: stableId,
		uuid: stableId,
		name: node.name || (isParticle ? "Particle" : "Group"),
		type: isParticle ? "particle" : "group",
		data: isParticle ? (node.system as ParticleSystem) : node,
		children: node
			.getChildren()
			.filter((child): child is TransformNode => child instanceof TransformNode)
			.map((child) => makeNode(child)),
	};
}

function sanitizeTexture(uuid: string, texture: Texture | null): { texture: any; image: any } {
	const imageUuid = `${uuid}-image`;
	const imageUrl = texture?.name || (texture as any)?.url || "";
	return {
		texture: {
			uuid,
			image: imageUuid,
			wrap: [1000, 1000],
			repeat: [1, 1],
			offset: [0, 0],
			rotation: 0,
		},
		image: {
			uuid: imageUuid,
			url: imageUrl,
		},
	};
}

function serializeNode(node: TransformNode, meta: ISerializationMeta): any {
	if (node instanceof ParticleEmitter) {
		const serialized = node.toJSON(meta);
		return {
			...serialized,
			name: node.name,
			uuid: getNodeUuid(node),
		};
	}

	return {
		uuid: getNodeUuid(node),
		type: "Group",
		name: node.name || "Group",
		position: [node.position.x, node.position.y, node.position.z],
		rotation: [node.rotation.x, node.rotation.y, node.rotation.z],
		quaternion: node.rotationQuaternion ? [node.rotationQuaternion.x, node.rotationQuaternion.y, node.rotationQuaternion.z, node.rotationQuaternion.w] : undefined,
		scale: [node.scaling.x, node.scaling.y, node.scaling.z],
		visible: node.isEnabled(),
		children: node
			.getChildren()
			.filter((child): child is TransformNode => child instanceof TransformNode)
			.map((child) => serializeNode(child, meta)),
	};
}

interface IEmitterCompletionTracking {
	emissionEnded: boolean;
}

/**
 * Quarks leaves non-loop systems with `emitEnded` set after the last particle dies; `update()` then
 * no-ops until `restart()` (e.g. via `stop()`). `play()` only clears `paused`, so replay must restart first.
 */
function playParticleSystem(system: ParticleSystem): void {
	const emitEnded = (system as unknown as { emitEnded?: boolean }).emitEnded === true;
	if (!system.looping && system.particleNum === 0 && emitEnded) {
		system.restart();
		return;
	}
	system.play();
}

export class QuarksEffectDocument {
	public readonly id: string;
	public name: string;
	public readonly root: TransformNode;
	private readonly _batchRenderer: BatchedRenderer;
	private _naturalIdleHandler?: (emitter: ParticleEmitter) => void;
	private readonly _emitterCompletionTracking = new WeakMap<ParticleEmitter, IEmitterCompletionTracking>();
	private readonly _emitterCompletionUnbind = new Map<ParticleEmitter, () => void>();

	public constructor(id: string, name: string, root: TransformNode, batchRenderer: BatchedRenderer) {
		this.id = id;
		this.name = name;
		this.root = root;
		this._batchRenderer = batchRenderer;
	}

	public static createEmpty(scene: Scene, baseName: string): QuarksEffectDocument {
		const id = createId("effect");
		const group = new TransformNode(baseName, scene);
		setNodeUuid(group);
		const batchRenderer = new BatchedRenderer(`batch-${id}`, scene);
		const document = new QuarksEffectDocument(id, baseName, group, batchRenderer);
		document.root.parent = batchRenderer;
		return document;
	}

	public static fromQuarksJson(scene: Scene, json: any, name: string): QuarksEffectDocument {
		const id = createId("effect");
		const loader = new QuarksLoader(scene);
		const root = loader.parse(json);
		setNodeUuid(root);
		const batchRenderer = new BatchedRenderer(`batch-${id}`, scene);
		root.parent = batchRenderer;
		QuarksUtil.addToBatchRenderer(root, batchRenderer);
		return new QuarksEffectDocument(id, name, root, batchRenderer);
	}

	public createGroup(parent: TransformNode): TransformNode {
		const group = new TransformNode("Group", parent.getScene());
		setNodeUuid(group);
		group.parent = parent;
		return group;
	}

	public createParticle(parent: TransformNode): ParticleEmitter {
		const system = new ParticleSystem({
			scene: parent.getScene(),
			duration: 2,
			looping: true,
			prewarm: false,
			shape: new SphereEmitter(),
			startLife: new ConstantValue(1),
			startSpeed: new ConstantValue(1),
			startSize: new ConstantValue(0.2),
			emissionOverTime: new ConstantValue(20),
			behaviors: [] as Behavior[],
			blendMode: Constants.ALPHA_ADD,
			renderMode: RenderMode.BillBoard,
		});

		const emitter = system.emitter as ParticleEmitter;
		emitter.name = "Particle";
		setNodeUuid(emitter);
		emitter.parent = parent;
		this._batchRenderer.addSystem(system);
		system.stop();
		this._bindEmitterNaturalIdleIfNeeded(emitter);
		return emitter;
	}

	/**
	 * When a non-looping system finishes emitting and the last particle dies, Quarks does not call stop().
	 * Subscribe to emitEnd + particleDied and invoke the handler once the system is fully idle.
	 */
	public setNaturalIdleHandler(handler: (emitter: ParticleEmitter) => void): void {
		this._naturalIdleHandler = handler;
		this._bindAllEmitterNaturalIdleListeners();
	}

	/** Call after user play/restart so a new non-loop run can fire idle again. */
	public resetNaturalIdleTracking(subtreeRoot: TransformNode): void {
		QuarksUtil.runOnAllParticleEmitters(subtreeRoot, (emitter) => {
			const tracking = this._emitterCompletionTracking.get(emitter);
			if (tracking) {
				tracking.emissionEnded = false;
			}
		});
	}

	public removeNode(node: TransformNode): void {
		if (node instanceof ParticleEmitter) {
			const unbind = this._emitterCompletionUnbind.get(node);
			unbind?.();
			(node.system as ParticleSystem).dispose();
		}
		for (const child of node.getChildren()) {
			if (child instanceof TransformNode) {
				this.removeNode(child);
			}
		}
		node.dispose();
	}

	public playNode(node: TransformNode): void {
		if (node instanceof ParticleEmitter) {
			playParticleSystem(node.system as ParticleSystem);
			return;
		}

		QuarksUtil.runOnAllParticleEmitters(node, (emitter) => playParticleSystem(emitter.system as ParticleSystem));
	}

	public pauseNode(node: TransformNode): void {
		if (node instanceof ParticleEmitter) {
			node.system.pause();
			return;
		}

		QuarksUtil.pause(node);
	}

	public stopNode(node: TransformNode): void {
		if (node instanceof ParticleEmitter) {
			node.system.stop();
			return;
		}

		QuarksUtil.stop(node);
	}

	public restartNode(node: TransformNode): void {
		if (node instanceof ParticleEmitter) {
			node.system.restart();
			node.system.play();
			return;
		}

		QuarksUtil.restart(node);
		QuarksUtil.play(node);
	}

	public play(): void {
		QuarksUtil.runOnAllParticleEmitters(this.root, (emitter) => playParticleSystem(emitter.system as ParticleSystem));
	}

	public pause(): void {
		QuarksUtil.pause(this.root);
	}

	public stop(): void {
		QuarksUtil.stop(this.root);
	}

	public restart(): void {
		QuarksUtil.restart(this.root);
		QuarksUtil.play(this.root);
	}

	public update(deltaSeconds: number): void {
		this._batchRenderer.update(deltaSeconds);
	}

	public toNodeTree(): IQuarksNode {
		const rootNode = makeNode(this.root);
		rootNode.uuid = this.id;
		rootNode.id = this.id;
		rootNode.name = this.name;
		return rootNode;
	}

	public serialize(): IQuarksSerializedEffect {
		const meta: ISerializationMeta = {
			geometries: {},
			materials: {},
			textures: {},
			images: {},
		};
		const object = serializeNode(this.root, meta);

		const materials = Object.values(meta.materials).map((material) => {
			if (!material || typeof material !== "object") {
				return material;
			}
			const { sourceMaterial: _sourceMaterial, ...safeMaterial } = material;
			return safeMaterial;
		});

		const textures: any[] = [];
		const images: any[] = [];
		for (const [uuid, texture] of Object.entries(meta.textures)) {
			const sanitized = sanitizeTexture(uuid, texture);
			textures.push(sanitized.texture);
			images.push(sanitized.image);
		}

		return {
			id: this.id,
			name: this.name,
			data: {
				object,
				geometries: Object.values(meta.geometries),
				materials,
				textures,
				images,
			},
		};
	}

	public dispose(): void {
		this._disposeNaturalIdleListeners();
		QuarksUtil.stop(this.root);
		this.removeNode(this.root);
		this._batchRenderer.dispose();
	}

	private _bindAllEmitterNaturalIdleListeners(): void {
		if (!this._naturalIdleHandler) {
			return;
		}
		QuarksUtil.runOnAllParticleEmitters(this.root, (emitter) => this._bindEmitterNaturalIdleIfNeeded(emitter));
	}

	private _bindEmitterNaturalIdleIfNeeded(emitter: ParticleEmitter): void {
		if (!this._naturalIdleHandler || this._emitterCompletionUnbind.has(emitter)) {
			return;
		}

		const system = emitter.system as ParticleSystem;
		const tracking: IEmitterCompletionTracking = { emissionEnded: false };
		this._emitterCompletionTracking.set(emitter, tracking);

		const onEmitEnd = (_event: ParticleSystemEvent): void => {
			tracking.emissionEnded = true;
			this._tryNaturalIdle(system, emitter);
		};

		const onParticleDied = (_event: ParticleSystemEvent): void => {
			this._tryNaturalIdle(system, emitter);
		};

		system.addEventListener("emitEnd", onEmitEnd);
		system.addEventListener("particleDied", onParticleDied);

		const unbind = (): void => {
			system.removeEventListener("emitEnd", onEmitEnd);
			system.removeEventListener("particleDied", onParticleDied);
			this._emitterCompletionUnbind.delete(emitter);
			this._emitterCompletionTracking.delete(emitter);
		};

		this._emitterCompletionUnbind.set(emitter, unbind);
	}

	private _tryNaturalIdle(system: ParticleSystem, emitter: ParticleEmitter): void {
		if (!this._naturalIdleHandler || system.looping) {
			return;
		}
		const tracking = this._emitterCompletionTracking.get(emitter);
		if (!tracking?.emissionEnded || system.particleNum > 0) {
			return;
		}
		tracking.emissionEnded = false;
		// Avoid `stop()`/`restart()` here — that can show one frame of new particles before pause.
		system.pause();
		this._naturalIdleHandler(emitter);
	}

	private _disposeNaturalIdleListeners(): void {
		for (const unbind of this._emitterCompletionUnbind.values()) {
			unbind();
		}
		this._emitterCompletionUnbind.clear();
		this._naturalIdleHandler = undefined;
	}
}
