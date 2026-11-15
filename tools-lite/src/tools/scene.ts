import { Camera, EngineContext, Mesh, onBeforeRender, onSceneDispose, ParticleSystem, PhysicsWorld, SceneContext, SceneNode } from "@babylonjs/lite";

import type { SpriteManager } from "./sprite";
import type { AdvancedAssetContainer } from "../loading/container/container";
import type { EditorAnimationGroup } from "../animation/animation-group";

import { setClassName } from "./guards";
import { Observable } from "./observable";
import { _attachSceneInputs, IKeyboardInfo, IPointerInfo } from "./inputs";

/**
 * Defines all the data the tools store for a scene: observables, nodes created while loading the editor scenes, etc.
 * Babylon Lite scenes only know the meshes, lights and animation groups added to them: the tools keep track of all
 * the objects created from the editor scenes (transform nodes, cameras, sound nodes, sprite managers, etc.) here.
 */
export interface ISceneData {
	/**
	 * Defines the reference to the scene the data belongs to.
	 */
	readonly scene: SceneContext;
	/**
	 * Defines the reference to the engine of the scene.
	 */
	readonly engine: EngineContext;

	/**
	 * Defines the observable notified at the beginning of each frame, before the animations are evaluated.
	 */
	readonly onBeginFrameObservable: Observable<SceneContext>;
	/**
	 * Defines the observable notified before each frame is rendered, after the animations were evaluated.
	 * Scripts `onUpdate` are called by this observable.
	 */
	readonly onBeforeRenderObservable: Observable<SceneContext>;
	/**
	 * Defines the observable notified each frame right after the animations handled by the tools were evaluated.
	 */
	readonly onAfterAnimationsObservable: Observable<SceneContext>;
	/**
	 * Defines the observable notified when the scene is disposed using `disposeScene`.
	 */
	readonly onDisposeObservable: Observable<SceneContext>;
	/**
	 * Defines the observable notified when a pointer event is raised on the canvas of the scene.
	 */
	readonly onPointerObservable: Observable<IPointerInfo>;
	/**
	 * Defines the observable notified when a keyboard event is raised on the canvas of the scene.
	 */
	readonly onKeyboardObservable: Observable<IKeyboardInfo>;

	/**
	 * Defines the list of all transform nodes created while loading the editor scenes (including sound nodes, sprite managers, etc.).
	 */
	readonly transformNodes: SceneNode[];
	/**
	 * Defines the list of all meshes created while loading the editor scenes (including instances).
	 */
	readonly meshes: Mesh[];
	/**
	 * Defines the list of all lights created while loading the editor scenes (including clustered lights).
	 */
	readonly lights: SceneNode[];
	/**
	 * Defines the list of all cameras created while loading the editor scenes.
	 */
	readonly cameras: Camera[];
	/**
	 * Defines the list of all animation groups created while loading the editor scenes.
	 */
	readonly animationGroups: EditorAnimationGroup[];

	/**
	 * @internal
	 * Defines the animation groups advanced each frame. As with Babylon.js, an animation group removed from the list
	 * of the animation groups of the scene keeps playing.
	 */
	readonly _tickedAnimationGroups: Set<EditorAnimationGroup>;
	/**
	 * Defines the list of all particle systems created while loading the editor scenes.
	 */
	readonly particleSystems: ParticleSystem[];
	/**
	 * Defines the list of all sprite managers created while loading the editor scenes.
	 */
	readonly spriteManagers: SpriteManager[];

	/**
	 * Defines the reference to the physics world used to create the physics bodies configured in the editor.
	 * @see SceneLoaderOptions.physicsWorld
	 */
	physicsWorld: PhysicsWorld | null;

	/**
	 * Defines the time elapsed since the last frame in milliseconds.
	 */
	deltaMs: number;
	/**
	 * Defines the number of frames rendered since the scene data was created.
	 */
	frameId: number;

	/**
	 * Defines the last known X position of the pointer in CSS pixels relative to the canvas.
	 */
	readonly pointerX: number;
	/**
	 * Defines the last known Y position of the pointer in CSS pixels relative to the canvas.
	 */
	readonly pointerY: number;

	/**
	 * Defines wether or not the scene has been disposed.
	 */
	isDisposed: boolean;
}

const scenesData = new WeakMap<SceneContext, ISceneData>();
const nodesScenes = new WeakMap<object, SceneContext>();
const nodesContainers = new WeakMap<object, AdvancedAssetContainer>();

/**
 * Returns the data stored by the tools for the given scene, creating it the first time.
 * @param scene defines the reference to the scene to get its data.
 */
export function getSceneData(scene: SceneContext): ISceneData {
	let data = scenesData.get(scene);
	if (data) {
		return data;
	}

	const engine = scene.surface.engine;

	const onPointerObservable = new Observable<IPointerInfo>();
	const onKeyboardObservable = new Observable<IKeyboardInfo>();

	const inputs = _attachSceneInputs(
		scene,
		(info) => onPointerObservable.notifyObservers(info),
		(info) => onKeyboardObservable.notifyObservers(info)
	);

	const sceneData: ISceneData = {
		scene,
		engine,

		onBeginFrameObservable: new Observable<SceneContext>(),
		onBeforeRenderObservable: new Observable<SceneContext>(),
		onAfterAnimationsObservable: new Observable<SceneContext>(),
		onDisposeObservable: new Observable<SceneContext>(),
		onPointerObservable,
		onKeyboardObservable,

		transformNodes: [],
		meshes: [],
		lights: [],
		cameras: [],
		animationGroups: [],
		_tickedAnimationGroups: new Set<EditorAnimationGroup>(),
		particleSystems: [],
		spriteManagers: [],

		physicsWorld: null,

		deltaMs: 0,
		frameId: 0,

		get pointerX() {
			return inputs.pointerX;
		},
		get pointerY() {
			return inputs.pointerY;
		},

		isDisposed: false,
	};

	data = sceneData;
	scenesData.set(scene, data);

	setClassName(scene, "Scene");

	onBeforeRender(scene, (deltaMs) => {
		if (sceneData.isDisposed) {
			return;
		}

		sceneData.deltaMs = deltaMs;
		++sceneData.frameId;

		sceneData.onBeginFrameObservable.notifyObservers(scene);

		for (const animationGroup of Array.from(sceneData._tickedAnimationGroups)) {
			animationGroup._tick(deltaMs);
		}

		sceneData.onAfterAnimationsObservable.notifyObservers(scene);
		sceneData.onBeforeRenderObservable.notifyObservers(scene);
	});

	onSceneDispose(scene, () => {
		sceneData.isDisposed = true;
		sceneData.onDisposeObservable.notifyObservers(scene);

		inputs.dispose();

		sceneData.onBeginFrameObservable.clear();
		sceneData.onBeforeRenderObservable.clear();
		sceneData.onAfterAnimationsObservable.clear();
		sceneData.onDisposeObservable.clear();
		sceneData.onPointerObservable.clear();
		sceneData.onKeyboardObservable.clear();

		scenesData.delete(scene);
	});

	return sceneData;
}

/**
 * Defines the kind of nodes the tools keep track of.
 */
export type SceneNodeKind = "transformNode" | "mesh" | "light" | "camera";

/**
 * Registers the given node in the lists of the tools for the given scene, so it can be found by name or id
 * (decorators, `getNodeByName`, etc.) and so scripts can be attached to it.
 * The nodes created while loading the editor scenes are registered automatically.
 * @param scene defines the reference to the scene the node belongs to.
 * @param node defines the reference to the node to register.
 * @param kind defines the kind of the node.
 */
export function registerSceneNode(scene: SceneContext, node: SceneNode | Camera, kind: SceneNodeKind): void {
	const data = getSceneData(scene);

	let list: (SceneNode | Camera)[];
	switch (kind) {
		case "mesh":
			list = data.meshes;
			break;
		case "light":
			list = data.lights;
			break;
		case "camera":
			list = data.cameras;
			break;
		default:
			list = data.transformNodes;
			break;
	}

	if (!list.includes(node)) {
		list.push(node);
	}

	nodesScenes.set(node, scene);
}

/**
 * Returns the reference to the scene the given node has been registered in.
 * @param node defines the reference to the node to get its scene.
 * @see registerSceneNode
 */
export function getNodeScene(node: object): SceneContext | null {
	return nodesScenes.get(node) ?? null;
}

/**
 * Returns the list of all the nodes created by the tools for the given scene: transform nodes, meshes, lights and cameras.
 * @param scene defines the reference to the scene to get its nodes.
 */
export function getSceneNodes(scene: SceneContext): (SceneNode | Camera)[] {
	const data = getSceneData(scene);
	return [...data.transformNodes, ...data.meshes, ...data.lights, ...data.cameras];
}

/**
 * @internal
 * Sets the asset container the given node belongs to.
 */
export function _setNodeContainer(node: object, container: AdvancedAssetContainer | null): void {
	if (container) {
		nodesContainers.set(node, container);
	} else {
		nodesContainers.delete(node);
	}
}

/**
 * Returns the reference to the asset container the given node belongs to, if any.
 * Each scene loaded using `@sceneAsset` or `@visibleAsAsset("scene", ...)` is loaded into its own asset container.
 * @param node defines the reference to the node to get its container.
 */
export function getNodeContainer(node: object): AdvancedAssetContainer | null {
	return nodesContainers.get(node) ?? null;
}

/**
 * Returns the node with the given name in the given scene.
 * This method also retrieves the clustered lights.
 * @param name defines the name of the node to retrieve.
 * @param scene defines the reference to the scene to search the node in.
 * @param container defines the optional reference to the asset container where to search the node in.
 * @returns the node if found, otherwise null.
 */
export function getNodeByName(name: string, scene: SceneContext, container: AdvancedAssetContainer | null = null): SceneNode | Camera | null {
	const nodes = container ? container.getNodes() : getSceneNodes(scene);
	return nodes.find((node) => node.name === name) ?? null;
}

/**
 * Returns the node with the given id in the given scene.
 * This method also retrieves the clustered lights.
 * @param id defines the id of the node to retrieve.
 * @param scene defines the reference to the scene to search the node in.
 * @returns the node if found, otherwise null.
 */
export function getNodeById(id: string, scene: SceneContext): SceneNode | Camera | null {
	return getSceneNodes(scene).find((node) => node.id === id) ?? null;
}

/**
 * Returns the mesh with the given id in the given scene.
 * @param id defines the id of the mesh to retrieve.
 * @param scene defines the reference to the scene to search the mesh in.
 * @returns the mesh if found, otherwise null.
 */
export function getMeshById(id: string, scene: SceneContext): Mesh | null {
	return getSceneData(scene).meshes.find((mesh) => mesh.id === id) ?? null;
}

/**
 * Returns the animation group with the given name in the given scene.
 * @param name defines the name of the animation group to retrieve.
 * @param scene defines the reference to the scene to search the animation group in.
 * @returns the animation group if found, otherwise null.
 */
export function getAnimationGroupByName(name: string, scene: SceneContext): EditorAnimationGroup | null {
	return getSceneData(scene).animationGroups.find((animationGroup) => animationGroup.name === name) ?? null;
}
