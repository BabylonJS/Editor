import {
	addClusteredLightContainer,
	ClusteredLightContainer,
	ClusteredPointLight,
	ClusteredSpotLight,
	createClusteredLightContainer,
	createClusteredPointLight,
	createClusteredSpotLight,
	createDirectionalLight,
	createHemisphericLight,
	createPointLight,
	createSpotLight,
	createTransformNode,
	LightBase,
	markClusteredLightContainerDirty,
	rebuildSceneRenderables,
	SceneContext,
	SceneNode,
	Vec3,
} from "@babylonjs/lite";

import { setClassName } from "../tools/guards";
import { getSceneData } from "../tools/scene";
import { isNodeEnabled } from "../tools/node";
import { babylonEulerToQuaternion, transformDirection } from "../tools/maths";

/**
 * Defines a light stored in a clustered light container. Babylon Lite clustered lights are plain data without
 * transform: the tools create a node for each of them (with its name, id, metadata, parent, etc.) so scripts can be
 * attached to them and so they can be moved like any other node. The clustered light follows its node each frame.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ClusteredLightNode extends SceneNode {
	/**
	 * Defines the reference to the Babylon Lite clustered light data driven by the node.
	 */
	readonly clusteredLight: ClusteredPointLight | ClusteredSpotLight;
	/**
	 * Defines the reference to the clustered light container the light belongs to.
	 */
	readonly clusteredLightContainer: ClusteredLightContainer;
	/**
	 * Defines the direction of the light (spot lights only), in the local space of the node.
	 */
	readonly direction: Vec3;
	intensity: number;
	range: number;
	diffuse: [number, number, number];
	/**
	 * Defines the full cone angle of the light in radians (spot lights only).
	 */
	angle: number;
}

const clusteredLightNodes = new WeakSet<object>();
const serializedLights = new WeakMap<object, any>();

/**
 * Returns the serialized Babylon.js light the given light (or node of a clustered light) was created from, if any.
 * Used to read the properties of the Babylon.js lights Babylon Lite doesn't have (intensity mode, etc.).
 * @param light defines the reference to the light.
 * @internal
 */
export function _getSerializedLightData(light: object): any {
	return serializedLights.get(light) ?? null;
}

/**
 * Returns wether or not the given object is a light stored in a clustered light container.
 * @param object defines the reference to the object to test.
 */
export function isClusteredLightNode(object: any): object is ClusteredLightNode {
	return clusteredLightNodes.has(object);
}

function applyNodeProperties(node: SceneNode, data: any): void {
	node.id = data.id;
	node.uniqueId = data.uniqueId;
	node.metadata = data.metadata ?? {};

	if (data.position) {
		node.position.set(data.position[0], data.position[1], data.position[2]);
	}

	if (data.rotationQuaternion) {
		node.rotationQuaternion.set(data.rotationQuaternion[0], data.rotationQuaternion[1], data.rotationQuaternion[2], data.rotationQuaternion[3]);
	} else if (data.rotation) {
		const q = babylonEulerToQuaternion(data.rotation[0], data.rotation[1], data.rotation[2]);
		node.rotationQuaternion.set(q[0], q[1], q[2], q[3]);
	}
}

/**
 * Parses the given serialized Babylon.js light (point, directional, spot or hemispheric) and creates the equivalent
 * Babylon Lite light.
 * @param data defines the serialized light.
 * @returns the created light or null if the type of the light is not supported.
 */
export function parseLight(data: any): LightBase | null {
	let light: LightBase & { intensity: number };

	const position: [number, number, number] = data.position ? [data.position[0], data.position[1], data.position[2]] : [0, 0, 0];
	const direction: [number, number, number] = data.direction ? [data.direction[0], data.direction[1], data.direction[2]] : [0, -1, 0];
	const intensity = data.intensity ?? 1;

	switch (data.type) {
		case 0: {
			const pointLight = createPointLight(position, intensity);
			pointLight.range = data.range ?? Number.MAX_VALUE;
			pointLight.diffuse = data.diffuse ? [data.diffuse[0], data.diffuse[1], data.diffuse[2]] : [1, 1, 1];
			pointLight.specular = data.specular ? [data.specular[0], data.specular[1], data.specular[2]] : [1, 1, 1];
			setClassName(pointLight, "PointLight");
			light = pointLight;
			break;
		}

		case 1: {
			const directionalLight = createDirectionalLight(direction, intensity);
			directionalLight.position.set(position[0], position[1], position[2]);
			directionalLight.diffuse = data.diffuse ? [data.diffuse[0], data.diffuse[1], data.diffuse[2]] : [1, 1, 1];
			directionalLight.specular = data.specular ? [data.specular[0], data.specular[1], data.specular[2]] : [1, 1, 1];
			setClassName(directionalLight, "DirectionalLight");
			light = directionalLight;
			break;
		}

		case 2: {
			const spotLight = createSpotLight(position, direction, data.angle ?? Math.PI / 2, data.exponent ?? 1, intensity);
			spotLight.range = data.range ?? Number.MAX_VALUE;
			spotLight.diffuse = data.diffuse ? [data.diffuse[0], data.diffuse[1], data.diffuse[2]] : [1, 1, 1];
			spotLight.specular = data.specular ? [data.specular[0], data.specular[1], data.specular[2]] : [1, 1, 1];
			setClassName(spotLight, "SpotLight");
			light = spotLight;
			break;
		}

		case 3: {
			const hemisphericLight = createHemisphericLight(direction, intensity);
			hemisphericLight.diffuseColor = data.diffuse ? [data.diffuse[0], data.diffuse[1], data.diffuse[2]] : [1, 1, 1];
			hemisphericLight.specularColor = data.specular ? [data.specular[0], data.specular[1], data.specular[2]] : [1, 1, 1];
			hemisphericLight.groundColor = data.groundColor ? [data.groundColor[0], data.groundColor[1], data.groundColor[2]] : [0, 0, 0];
			setClassName(hemisphericLight, "HemisphericLight");
			light = hemisphericLight;
			break;
		}

		default:
			console.warn(`Babylon.js Editor Tools Lite: light "${data.name}" of type "${data.type}" is not supported by Babylon Lite.`);
			return null;
	}

	light.name = data.name;
	applyNodeProperties(light, data);

	// Babylon Lite lights are positioned using their "position" property only.
	if (data.type === 3) {
		light.position.set(0, 0, 0);
	}

	if (data.excludedMeshesIds?.length) {
		light.excludedMeshIds = new Set(data.excludedMeshesIds);
	}

	if (data.includedOnlyMeshesIds?.length) {
		light.includedOnlyMeshIds = new Set(data.includedOnlyMeshesIds);
	}

	serializedLights.set(light, data);

	return light;
}

/**
 * Defines the clustered lights created for a scene.
 */
export interface IClusteredLights {
	/**
	 * Defines the reference to the clustered light container.
	 */
	container: ClusteredLightContainer;
	/**
	 * Defines the nodes of the clustered lights of the container.
	 */
	nodes: ClusteredLightNode[];
}

/**
 * Creates the clustered light container and the clustered lights listed in the given configuration
 * (`metadata.clusteredLight` of the scenes saved by the editor). For each light a node is created so the light can
 * be found by name or id and can have scripts attached. The container must be added to the scene using
 * `addClusteredLights` once the meshes using PBR materials have been added to the scene.
 * @param configuration defines the clustered light configuration saved by the editor.
 * @param lightsData defines the list of serialized lights of the scene.
 * @returns the created container and the nodes of its lights, or null if the configuration has no light.
 */
export function createClusteredLights(configuration: any, lightsData: any[]): IClusteredLights | null {
	const lightIds = (configuration?.lights ?? []) as string[];
	if (!lightIds.length) {
		return null;
	}

	const container = createClusteredLightContainer({
		horizontalTiles: configuration.horizontalTiles,
		verticalTiles: configuration.verticalTiles,
		zSlices: configuration.depthSlices,
	});

	const nodes: ClusteredLightNode[] = [];

	lightIds.forEach((lightId) => {
		const data = lightsData.find((l) => l.id === lightId);
		if (!data || (data.type !== 0 && data.type !== 2)) {
			return;
		}

		const diffuse: [number, number, number] = data.diffuse ? [data.diffuse[0], data.diffuse[1], data.diffuse[2]] : [1, 1, 1];
		const range = Math.min(data.range ?? configuration.maxRange ?? 1000, configuration.maxRange ?? Number.MAX_VALUE);

		const clusteredLight =
			data.type === 2
				? createClusteredSpotLight(container, {
						position: [0, 0, 0],
						direction: data.direction ?? [0, -1, 0],
						angle: data.angle ?? Math.PI / 2,
						diffuse,
						range,
						intensity: data.intensity ?? 1,
					})
				: createClusteredPointLight(container, {
						position: [0, 0, 0],
						diffuse,
						range,
						intensity: data.intensity ?? 1,
					});

		const node = createTransformNode(data.name) as ClusteredLightNode;
		applyNodeProperties(node, data);
		serializedLights.set(node, data);

		let intensity = data.intensity ?? 1;
		const direction: Vec3 = data.direction ? { x: data.direction[0], y: data.direction[1], z: data.direction[2] } : { x: 0, y: -1, z: 0 };

		Object.defineProperties(node, {
			clusteredLight: { value: clusteredLight },
			clusteredLightContainer: { value: container },
			direction: { value: direction },
			intensity: {
				get: () => intensity,
				set: (value: number) => {
					intensity = value;
					markClusteredLightContainerDirty(container);
				},
			},
			range: {
				get: () => clusteredLight.range,
				set: (value: number) => {
					clusteredLight.range = value;
					markClusteredLightContainerDirty(container);
				},
			},
			diffuse: {
				get: () => clusteredLight.diffuse,
				set: (value: [number, number, number]) => {
					clusteredLight.diffuse = value;
					markClusteredLightContainerDirty(container);
				},
			},
			angle: {
				get: () => (clusteredLight as ClusteredSpotLight).angle ?? 0,
				set: (value: number) => {
					if ((clusteredLight as ClusteredSpotLight).angle !== undefined) {
						(clusteredLight as ClusteredSpotLight).angle = value;
						markClusteredLightContainerDirty(container);
					}
				},
			},
		});

		setClassName(node, data.type === 2 ? "SpotLight" : "PointLight");
		clusteredLightNodes.add(node);

		nodes.push(node);
	});

	if (!nodes.length) {
		return null;
	}

	return { container, nodes };
}

/**
 * Adds the given clustered lights to the given scene: the container is registered and the clustered lights follow
 * their nodes (world position, direction, enabled state and intensity) from now on.
 * @param scene defines the reference to the scene where to add the clustered lights.
 * @param clusteredLights defines the clustered lights created using `createClusteredLights`.
 */
export function addClusteredLights(scene: SceneContext, clusteredLights: IClusteredLights): void {
	const { container, nodes } = clusteredLights;

	updateClusteredLights(nodes);

	// Babylon Lite requires a camera to add a clustered light container: when the scene has no camera yet, the
	// container is added as soon as the scene has one.
	const sceneData = getSceneData(scene);
	if (scene.camera) {
		addClusteredLightContainer(scene, container);
	} else {
		const observer = sceneData.onBeginFrameObservable.add(() => {
			if (!scene.camera) {
				return;
			}

			observer.remove();
			addClusteredLightContainer(scene, container);
			rebuildSceneRenderables(scene).catch((e) => console.error(e));
		});
	}

	const lastVersions = new Map<ClusteredLightNode, number>();
	const lastStates = new Map<ClusteredLightNode, string>();

	sceneData.onAfterAnimationsObservable.add(() => {
		let dirty = false;

		for (const node of nodes) {
			const enabled = isNodeEnabled(node, true);
			const state = `${enabled}_${node.intensity}_${node.direction.x}_${node.direction.y}_${node.direction.z}`;

			if (lastVersions.get(node) === node.worldMatrixVersion && lastStates.get(node) === state) {
				continue;
			}

			lastVersions.set(node, node.worldMatrixVersion);
			lastStates.set(node, state);

			updateClusteredLights([node]);
			dirty = true;
		}

		if (dirty) {
			markClusteredLightContainerDirty(container);
		}
	});
}

function updateClusteredLights(nodes: ClusteredLightNode[]): void {
	for (const node of nodes) {
		const matrix = node.worldMatrix;
		const light = node.clusteredLight;

		light.position[0] = matrix[12];
		light.position[1] = matrix[13];
		light.position[2] = matrix[14];

		light.intensity = isNodeEnabled(node, true) ? node.intensity : 0;

		const spotLight = light as ClusteredSpotLight;
		if (spotLight.direction) {
			const direction = transformDirection(matrix, node.direction.x, node.direction.y, node.direction.z);
			spotLight.direction[0] = direction.x;
			spotLight.direction[1] = direction.y;
			spotLight.direction[2] = direction.z;
		}
	}
}
