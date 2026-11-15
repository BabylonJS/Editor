import {
	Camera,
	cloneTransformNode,
	createTransformNode,
	enableMirroredMeshes,
	enableStandardVertexColors,
	GaussianSplattingMesh,
	isPbrMaterial,
	isStandardMaterial,
	LightBase,
	Material,
	Mesh,
	ParticleSystem,
	SceneContext,
	SceneNode,
	ShadowGenerator,
} from "@babylonjs/lite";

import { SoundNode } from "../tools/sound";
import { loadFile } from "../tools/request";
import { SpriteManager, SpriteManagerNode } from "../tools/sprite";
import { NodeParticleSystemMesh } from "../tools/particle";
import { getSceneData, registerSceneNode } from "../tools/scene";
import { warnOnce } from "../tools/warn";
import { isCamera, isSpotLight, setClassName } from "../tools/guards";
import { distanceVec3, getAbsolutePosition } from "../tools/maths";
import { isShadowCasterCandidate } from "../tools/light";
import { _addNodeToScene, _refreshNodeVisibility, _setCameraParent, setMeshVisibleState, setNodeEnabled } from "../tools/node";

import { EditorAnimationGroup } from "../animation/animation-group";
import { parseAnimationGroup, parseNodeAnimations } from "../animation/parse";

import { parseCamera } from "./camera";
import { parseSoundNode } from "./sound";
import { parseSpriteMapNode } from "./sprite-map";
import { parseSpriteManagerNode } from "./sprite-manager";
import { createShadowGenerator, setShadowGeneratorCasters } from "./shadows";
import { parseSerializedMaterial } from "./material";
import { parseGaussianSplattingMesh } from "./gaussian-splatting";
import { parseNodeParticleSystemSet } from "./node-particle-system-set";
import { addClusteredLights, createClusteredLights, IClusteredLights, parseLight } from "./light";
import { isPbrSkyboxData } from "./materials/pbr";
import { applyEnvironmentIntensity, applySceneProperties, getEnvironmentTextureUrl, loadSceneEnvironment } from "./environment";
import { _clearBinaryFilesCache, IMeshGeometryData, loadMeshGeometry } from "./geometry";
import {
	applySerializedThinInstances,
	applySerializedTransform,
	configureMeshLods,
	createMeshFromSerializedData,
	createMeshInstances,
	createMeshMorphTargets,
	getMeshMorphTargets,
	IMeshLodLevel,
	isSerializedNodeMirrored,
	registerMeshBehaviors,
} from "./mesh";

/**
 * Defines all the entities created while parsing an editor scene (`.babylon` file).
 */
export interface IParsedSceneEntities {
	/**
	 * Defines the list of transform nodes (including the sound nodes, sprite manager nodes, gaussian splatting meshes, etc.).
	 */
	readonly transformNodes: SceneNode[];
	/**
	 * Defines the list of meshes, including the instances.
	 */
	readonly meshes: Mesh[];
	/**
	 * Defines the list of lights, including the clustered lights.
	 */
	readonly lights: SceneNode[];
	/**
	 * Defines the list of cameras.
	 */
	readonly cameras: Camera[];
	/**
	 * Defines the list of materials.
	 */
	readonly materials: Material[];
	/**
	 * Defines the list of shadow generators.
	 */
	readonly shadowGenerators: ShadowGenerator[];
	/**
	 * Defines the list of animation groups.
	 */
	readonly animationGroups: EditorAnimationGroup[];
	/**
	 * Defines the list of particle systems built from the node particle system sets.
	 */
	readonly particleSystems: ParticleSystem[];
	/**
	 * Defines the list of sprite managers.
	 */
	readonly spriteManagers: SpriteManager[];
	/**
	 * Defines the list of gaussian splatting meshes.
	 */
	readonly gaussianSplattingMeshes: GaussianSplattingMesh[];
	/**
	 * Defines the list of all meshes added to the Babylon Lite scene, including the internal ones (sub-meshes, levels of detail).
	 */
	readonly allMeshes: Mesh[];
	/**
	 * Defines the clustered lights of the scene, if any.
	 */
	clusteredLights: IClusteredLights | null;
	/**
	 * Defines the active camera of the scene, if any.
	 */
	activeCamera: Camera | null;
}

export interface IParseBabylonSceneOptions {
	/**
	 * Defines wether or not the scene is the main scene being loaded: its properties (clear color, fog, environment,
	 * active camera, clustered lights) are applied to the Babylon Lite scene. False for the scenes loaded as assets.
	 */
	isMainScene: boolean;
	/**
	 * Defines the optional URL of the BRDF lookup texture used by the environment.
	 */
	brdfUrl?: string;
	/**
	 * Defines the function called to notify the parsing progress in interval [0, 1].
	 */
	onProgress?: (progress: number) => void;
}

/**
 * Loads the morph targets of the given serialized morph target manager: the positions and normals of the targets
 * are stored in binary files by the editor (`delayLoadingFile`).
 */
async function loadMorphTargetsData(rootUrl: string, managerData: any): Promise<any[]> {
	return Promise.all(
		(managerData.targets ?? []).map(async (target: any) => {
			if (!target.delayLoadingFile) {
				return target;
			}

			const buffer = await loadFile(`${rootUrl}${target.delayLoadingFile}`, "arraybuffer");

			return {
				...target,
				positions: target.positionsCount ? new Float32Array(buffer, target.positionsOffset, target.positionsCount) : null,
				normals: target.normalsCount ? new Float32Array(buffer, target.normalsOffset, target.normalsCount) : null,
			};
		})
	);
}

function getNodeKey(id: string | number): string {
	return typeof id === "number" ? `u:${id}` : `i:${id}`;
}

/**
 * Parses the given serialized editor scene (`.babylon` file saved by the Babylon.js Editor) and creates all its
 * entities using Babylon Lite: meshes, materials, lights, shadows, cameras, transform nodes, sound nodes, sprite
 * managers, node particle systems, gaussian splatting meshes and animation groups. The created meshes and lights are
 * added to the given scene and all the nodes are registered in the lists of the tools.
 * The features of Babylon.js that Babylon Lite doesn't support are listed in MISSING_FEATURES.md.
 * @param scene defines the reference to the scene where to add the entities.
 * @param rootUrl defines the root url of the scene (where the assets are located).
 * @param data defines the serialized scene.
 * @param options defines the options of the parsing.
 */
export async function parseBabylonScene(scene: SceneContext, rootUrl: string, data: any, options: IParseBabylonSceneOptions): Promise<IParsedSceneEntities> {
	const sceneData = getSceneData(scene);
	const quality = scene.loadingShadowsQuality ?? scene.loadingQuality ?? "high";

	const entities: IParsedSceneEntities = {
		transformNodes: [],
		meshes: [],
		lights: [],
		cameras: [],
		materials: [],
		shadowGenerators: [],
		animationGroups: [],
		particleSystems: [],
		spriteManagers: [],
		gaussianSplattingMeshes: [],
		allMeshes: [],
		clusteredLights: null,
		activeCamera: null,
	};

	const nodes = new Map<string, SceneNode | Camera>();
	const nodesData = new Map<SceneNode | Camera, any>();
	const instancesBySource = new Map<string, Mesh[]>();
	const meshesById = new Map<string, Mesh>();
	const geometries = new Map<Mesh, IMeshGeometryData>();

	const registerNode = (node: SceneNode | Camera, nodeData: any) => {
		if (nodeData.uniqueId !== undefined) {
			nodes.set(getNodeKey(nodeData.uniqueId), node);
		}

		if (nodeData.id !== undefined && !nodes.has(getNodeKey(nodeData.id))) {
			nodes.set(getNodeKey(nodeData.id), node);
		}

		nodesData.set(node, nodeData);
	};

	let progressCount = 0;
	let progressTotal = 1;
	const notifyProgress = () => {
		++progressCount;
		options.onProgress?.(Math.min(1, progressCount / progressTotal));
	};

	// Scene properties and environment
	let environmentPromise: Promise<boolean> = Promise.resolve(false);

	if (options.isMainScene) {
		applySceneProperties(scene, data);
		environmentPromise = loadSceneEnvironment(scene, rootUrl, data, options.brdfUrl);
	}

	// Lights
	const clusteredLightIds = new Set<string>(options.isMainScene ? (data.metadata?.clusteredLight?.lights ?? []) : []);

	if (options.isMainScene && clusteredLightIds.size) {
		entities.clusteredLights = createClusteredLights(data.metadata.clusteredLight, data.lights ?? []);
		entities.clusteredLights?.nodes.forEach((node) => {
			entities.lights.push(node);
			registerNode(
				node,
				(data.lights as any[]).find((l) => l.id === node.id)
			);
		});
	}

	(data.lights ?? []).forEach((lightData: any) => {
		if (clusteredLightIds.has(lightData.id)) {
			return;
		}

		const light = parseLight(lightData);
		if (!light) {
			return;
		}

		_addNodeToScene(scene, light);

		entities.lights.push(light);
		registerNode(light, lightData);
	});

	// Entities of Babylon.js that Babylon Lite doesn't support (see MISSING_FEATURES.md)
	if (data.particleSystems?.length) {
		warnOnce(
			"particle-systems",
			"the particle systems (ParticleSystem and GPUParticleSystem) are not supported by Babylon Lite (only the node particle systems are): they are not loaded."
		);
	}

	if (data.reflectionProbes?.length) {
		warnOnce("reflection-probes", "the reflection probes are not supported by Babylon Lite: they are not loaded.");
	}

	if (data.lensFlareSystems?.length) {
		warnOnce("lens-flares", "the lens flare systems are not supported by Babylon Lite: they are not loaded.");
	}

	if (data.effectLayers?.length) {
		warnOnce("effect-layers", "the effect layers (glow and highlight layers) are not supported by Babylon Lite: they are not loaded.");
	}

	if (data.sounds?.length) {
		warnOnce("legacy-sounds", "the legacy sounds of the scene file are not supported by the tools: use the sound nodes of the editor.");
	}

	// Shadow generators
	(data.shadowGenerators ?? []).forEach((shadowGeneratorData: any) => {
		const light = entities.lights.find((l) => l.id === shadowGeneratorData.lightId) as LightBase | undefined;
		if (!light || !("lightType" in light)) {
			return;
		}

		const shadowGenerator = createShadowGenerator(scene, light, shadowGeneratorData, quality);
		if (shadowGenerator) {
			light.shadowGenerator = shadowGenerator;
			entities.shadowGenerators.push(shadowGenerator);
		}
	});

	const shadowLightIndices = entities.shadowGenerators.map((shadowGenerator) => scene.lights.findIndex((light) => light.shadowGenerator === shadowGenerator));

	// Materials
	progressTotal += (data.materials?.length ?? 0) + (data.meshes?.length ?? 0) + (data.transformNodes?.length ?? 0);

	const materials = new Map<string, Material | null>();
	const multiMaterials = new Map<string, string[]>();

	(data.multiMaterials ?? []).forEach((multiMaterialData: any) => {
		multiMaterials.set(multiMaterialData.id, multiMaterialData.materials ?? []);
	});

	const environmentTextureUrl = getEnvironmentTextureUrl(data);

	await Promise.all(
		(data.materials ?? []).map(async (materialData: any) => {
			if (
				options.isMainScene &&
				isPbrSkyboxData(materialData) &&
				getEnvironmentTextureUrl({ environmentTexture: materialData.reflectionTexture }) !== environmentTextureUrl
			) {
				warnOnce(
					"pbr-skybox-texture",
					`the skybox material "${materialData.name}" doesn't use the environment texture of the scene: Babylon Lite skyboxes display the environment of the scene.`
				);
			}

			const material = await parseSerializedMaterial(scene, rootUrl, materialData, {
				sceneAmbientColor: data.ambientColor ?? [0, 0, 0],
				shadowGenerators: entities.shadowGenerators,
				shadowLightIndices,
			});

			if (material) {
				(material as any).id = materialData.id;
				(material as any).uniqueId = materialData.uniqueId;
				entities.materials.push(material);
			}

			materials.set(materialData.id, material);
			notifyProgress();
		})
	);

	const getMeshMaterial = (meshData: any, materialIndex: number): Material | null => {
		if (meshData.materialId === undefined || meshData.materialId === null) {
			return null;
		}

		const multiMaterial = multiMaterials.get(meshData.materialId);
		if (multiMaterial) {
			const materialId = multiMaterial[materialIndex] ?? multiMaterial[0];
			return materialId ? (materials.get(materialId) ?? null) : null;
		}

		return materials.get(meshData.materialId) ?? null;
	};

	// Transform nodes
	const asyncPromises: Promise<unknown>[] = [];

	(data.transformNodes ?? []).forEach((transformNodeData: any) => {
		const node = createTransformNode(transformNodeData.name);
		node.id = transformNodeData.id;
		node.uniqueId = transformNodeData.uniqueId;
		node.metadata = transformNodeData.metadata ?? {};

		applySerializedTransform(node, transformNodeData);
		setClassName(node, "TransformNode");

		if (transformNodeData.isSoundNode) {
			asyncPromises.push(parseSoundNode(scene, rootUrl, node as SoundNode, transformNodeData).then(() => notifyProgress()));
		} else if (transformNodeData.isSpriteManager) {
			asyncPromises.push(
				parseSpriteManagerNode(scene, rootUrl, node as SpriteManagerNode, transformNodeData).then(() => {
					const spriteManager = (node as SpriteManagerNode).spriteManager;
					if (spriteManager) {
						entities.spriteManagers.push(spriteManager);
					}
					notifyProgress();
				})
			);
		} else if (transformNodeData.isSpriteMap) {
			parseSpriteMapNode(node as any, transformNodeData);
			notifyProgress();
		} else {
			notifyProgress();
		}

		entities.transformNodes.push(node);
		registerNode(node, transformNodeData);
	});

	// Meshes
	let hasMirroredMeshes = false;
	let hasStandardVertexColors = false;

	const lodConfigurations: { mesh: Mesh; data: any }[] = [];

	await Promise.all(
		(data.meshes ?? []).map(async (meshData: any) => {
			if (!meshData) {
				return;
			}

			hasMirroredMeshes ||= isSerializedNodeMirrored(meshData) || (meshData.instances ?? []).some((instance: any) => isSerializedNodeMirrored(instance));

			// Gaussian splatting
			if (meshData.type === "GaussianSplattingMesh") {
				const proxies = await parseGaussianSplattingMesh(scene, rootUrl, meshData);
				proxies.forEach((proxy) => {
					entities.gaussianSplattingMeshes.push(proxy.mesh);
					entities.transformNodes.push(proxy.mesh);
					registerNode(proxy.mesh, proxy.data);
				});

				return notifyProgress();
			}

			let geometry: IMeshGeometryData | null = null;
			try {
				geometry = await loadMeshGeometry(scene, rootUrl, meshData, data);
			} catch (e) {
				console.error(`Failed to load the geometry of the mesh "${meshData.name}".`, e);
			}

			// Node particle systems emitters and meshes without geometry are transform nodes.
			if (!geometry) {
				const node = createTransformNode(meshData.name);
				node.id = meshData.id;
				node.uniqueId = meshData.uniqueId;
				node.metadata = meshData.metadata ?? {};

				applySerializedTransform(node, meshData);
				setClassName(node, "TransformNode");

				if (meshData.isNodeParticleSystemMesh) {
					asyncPromises.push(
						parseNodeParticleSystemSet(scene, rootUrl, node as NodeParticleSystemMesh, meshData).then(() => {
							(node as NodeParticleSystemMesh).particleSystemSet?.systems.forEach((system) => entities.particleSystems.push(system));
						})
					);
				}

				entities.transformNodes.push(node);
				registerNode(node, meshData);

				return notifyProgress();
			}

			const created = createMeshFromSerializedData(scene, meshData, geometry, (materialIndex) => getMeshMaterial(meshData, materialIndex));
			const mesh = created.mesh;

			mesh.id = meshData.id;
			mesh.uniqueId = meshData.uniqueId;
			mesh.metadata = meshData.metadata ?? {};

			applySerializedTransform(mesh, meshData);
			setClassName(mesh, meshData.type === "GroundMesh" ? "GroundMesh" : "Mesh");

			if (geometry.colors && [mesh, ...created.subMeshes].some((m) => isStandardMaterial(m.material))) {
				hasStandardVertexColors = true;
			}

			// Morph targets
			if (meshData.morphTargetManagerId !== undefined && meshData.morphTargetManagerId !== null) {
				const managerData = (data.morphTargetManagers ?? []).find((m: any) => m.id === meshData.morphTargetManagerId);
				if (managerData) {
					if (!isPbrMaterial(mesh.material)) {
						warnOnce(
							`morph-${mesh.name}`,
							`the morph targets of the mesh "${mesh.name}" are not supported by Babylon Lite (only meshes using PBR materials support morph targets).`
						);
					} else {
						try {
							const targets = await loadMorphTargetsData(rootUrl, managerData);
							createMeshMorphTargets(scene.surface.engine, mesh, geometry, targets);
						} catch (e) {
							console.error(`Failed to load the morph targets of the mesh "${mesh.name}".`, e);
						}
					}
				}
			}

			if (meshData.skeletonId !== undefined && meshData.skeletonId !== null) {
				warnOnce("skeletons", "skeletons are not supported by Babylon Lite for the scenes made in the editor: skinned meshes are displayed in their bind pose.");
			}

			applySerializedThinInstances(mesh, meshData);

			geometries.set(mesh, geometry);
			meshesById.set(meshData.id, mesh);

			entities.meshes.push(mesh);
			entities.allMeshes.push(mesh, ...created.subMeshes);
			registerNode(mesh, meshData);

			registerMeshBehaviors(scene, mesh, meshData.billboardMode ?? 0, meshData.infiniteDistance ?? false);

			// Instances
			const instances = createMeshInstances(mesh, meshData);
			instances.forEach((instance, index) => {
				const instanceData = meshData.instances[index];

				entities.meshes.push(instance);
				entities.allMeshes.push(instance, ...(instance.children as Mesh[]));
				registerNode(instance, instanceData);

				registerMeshBehaviors(scene, instance, instanceData.billboardMode ?? meshData.billboardMode ?? 0, meshData.infiniteDistance ?? false);
			});

			instancesBySource.set(meshData.id, instances);

			if (meshData.lodMeshIds?.length) {
				lodConfigurations.push({ mesh, data: meshData });
			}

			notifyProgress();
		})
	);

	// Cameras
	(data.cameras ?? []).forEach((cameraData: any) => {
		const camera = parseCamera(cameraData);
		if (!camera) {
			return;
		}

		entities.cameras.push(camera);
		registerNode(camera, cameraData);
	});

	if (options.isMainScene) {
		entities.activeCamera = entities.cameras.find((camera) => camera.id === data.activeCameraID) ?? entities.cameras[0] ?? null;
	}

	// Parenting
	const findParent = (parentId: string | number, parentInstanceIndex?: number) => {
		const parent = nodes.get(getNodeKey(parentId)) ?? (typeof parentId === "number" ? nodes.get(getNodeKey(String(parentId))) : undefined);
		if (!parent) {
			return null;
		}

		if (parentInstanceIndex !== undefined && parentInstanceIndex !== null) {
			const sourceData = nodesData.get(parent);
			return instancesBySource.get(sourceData?.id)?.[parentInstanceIndex] ?? parent;
		}

		return parent;
	};

	nodesData.forEach((nodeData, node) => {
		const parentId = nodeData.parentId ?? nodeData.metadata?.parentId;
		if (parentId === undefined || parentId === null) {
			return;
		}

		const parent = findParent(parentId, nodeData.parentInstanceIndex);
		if (!parent || parent === node) {
			return;
		}

		if (isCamera(node)) {
			_setCameraParent(node, parent);
		} else {
			(node as SceneNode).parent = parent as SceneNode;
			parent.children.push(node as SceneNode);
		}
	});

	// Levels of detail
	lodConfigurations.forEach(({ mesh, data: meshData }) => {
		// Same as Babylon.js: only the distances are used (the screen coverages are ignored).
		const distances = meshData.lodDistances as number[] | undefined;
		const ids = meshData.lodMeshIds as string[];

		if (!distances) {
			return;
		}

		if (distances.length < ids.length) {
			return console.warn(`Invalid level of detail distances for ${mesh.name}`);
		}

		const levels: IMeshLodLevel[] = [];
		ids.forEach((id, index) => {
			const lodMesh = meshesById.get(id);
			if (lodMesh) {
				levels.push({ distanceOrScreenCoverage: distances[index], mesh: lodMesh });
			}
		});

		// Same as Babylon.js: an extra distance culls the mesh.
		const culling = distances.length > ids.length ? distances[distances.length - 1] : 0;
		if (culling > 0) {
			levels.push({ distanceOrScreenCoverage: culling, mesh: null });
		}

		levels.forEach((level) => {
			if (level.mesh) {
				level.mesh.originalDistanceOrScreenCoverage = level.distanceOrScreenCoverage;
			}
		});

		const instances = instancesBySource.get(meshData.id) ?? [];

		// The instances use clones of the levels of detail, displayed using their transform.
		instances.forEach((instance) => {
			const instanceLevels = levels.map((level) => {
				if (!level.mesh) {
					return { ...level };
				}

				const clone = cloneTransformNode(level.mesh) as Mesh;
				clone.name = `${level.mesh.name}_${instance.name}`;
				clone.id = `${level.mesh.id}_${instance.id}`;
				clone.originalDistanceOrScreenCoverage = level.distanceOrScreenCoverage;
				setClassName(clone, "Mesh");

				entities.allMeshes.push(clone, ...(clone.children as Mesh[]));

				return { distanceOrScreenCoverage: level.distanceOrScreenCoverage, mesh: clone };
			});

			configureMeshLods(scene, instance, instanceLevels);
		});

		configureMeshLods(scene, mesh, levels);
	});

	// Shadow casters
	(data.shadowGenerators ?? []).forEach((shadowGeneratorData: any) => {
		const light = entities.lights.find((l) => l.id === shadowGeneratorData.lightId) as LightBase | undefined;
		const shadowGenerator = light?.shadowGenerator;
		if (!light || !shadowGenerator) {
			return;
		}

		const casters = new Set<Mesh>();
		const lightPosition = getAbsolutePosition(light);
		const range = isSpotLight(light) ? light.range : Number.MAX_VALUE;

		const addCaster = (mesh: Mesh) => {
			if (!isShadowCasterCandidate(mesh)) {
				return;
			}

			// Same as the render list predicate of the Babylon.js version of the tools, evaluated once at load time.
			if (range !== Number.MAX_VALUE && distanceVec3(getAbsolutePosition(mesh), lightPosition) > range) {
				return;
			}

			casters.add(mesh);
			mesh.children.forEach((child) => {
				if ("material" in child) {
					casters.add(child as Mesh);
				}
			});
		};

		(shadowGeneratorData.renderList ?? []).forEach((meshId: string) => {
			const mesh = meshesById.get(meshId) ?? (entities.meshes.find((m) => m.id === meshId) as Mesh | undefined);
			if (!mesh) {
				return;
			}

			addCaster(mesh);
			instancesBySource.get(meshId)?.forEach((instance) => addCaster(instance));
		});

		setShadowGeneratorCasters(shadowGenerator, Array.from(casters));
	});

	// Wait for the sounds, sprites, particles, etc.
	await Promise.all(asyncPromises);

	// Add the meshes to the scene
	entities.allMeshes.forEach((mesh) => {
		try {
			_addNodeToScene(scene, mesh);
		} catch (e) {
			console.error(`Failed to add the mesh "${mesh.name}" to the scene.`, e);
		}
	});

	// Register the nodes in the lists of the tools
	entities.transformNodes.forEach((node) => registerSceneNode(scene, node, "transformNode"));
	entities.meshes.forEach((mesh) => registerSceneNode(scene, mesh, "mesh"));
	entities.lights.forEach((light) => registerSceneNode(scene, light, "light"));
	entities.cameras.forEach((camera) => registerSceneNode(scene, camera, "camera"));

	entities.particleSystems.forEach((particleSystem) => {
		if (!sceneData.particleSystems.includes(particleSystem)) {
			sceneData.particleSystems.push(particleSystem);
		}
	});

	// Enabled and visible states
	nodesData.forEach((nodeData, node) => {
		if (nodeData.isEnabled === false) {
			setNodeEnabled(node, false);
		}

		if (nodeData.isVisible === false && entities.meshes.includes(node as Mesh)) {
			setMeshVisibleState(node as SceneNode, false);
		}
	});

	entities.allMeshes.forEach((mesh) => _refreshNodeVisibility(mesh));

	// Animations
	nodesData.forEach((nodeData, node) => {
		const animationGroup = parseNodeAnimations(scene, node, nodeData);
		if (animationGroup) {
			entities.animationGroups.push(animationGroup);
		}
	});

	const morphTargetsById = new Map<string, unknown>();
	entities.meshes.forEach((mesh) => getMeshMorphTargets(mesh).forEach((target) => morphTargetsById.set(target.id, target)));

	(data.animationGroups ?? []).forEach((animationGroupData: any) => {
		const animationGroup = parseAnimationGroup(scene, animationGroupData, (targetedAnimationData) => {
			if (targetedAnimationData.animation?.property === "influence") {
				return morphTargetsById.get(targetedAnimationData.targetId) ?? null;
			}

			return nodes.get(getNodeKey(targetedAnimationData.targetId)) ?? null;
		});

		entities.animationGroups.push(animationGroup);
	});

	// Active camera
	if (options.isMainScene && entities.activeCamera) {
		scene.camera = entities.activeCamera;
	}

	// Clustered lights
	if (entities.clusteredLights) {
		addClusteredLights(scene, entities.clusteredLights);
	}

	if (hasMirroredMeshes) {
		await enableMirroredMeshes(scene);
	}

	if (hasStandardVertexColors) {
		enableStandardVertexColors();
	}

	// Environment
	await environmentPromise;

	applyEnvironmentIntensity(entities.materials, data);

	_clearBinaryFilesCache(scene);

	options.onProgress?.(1);

	return entities;
}
