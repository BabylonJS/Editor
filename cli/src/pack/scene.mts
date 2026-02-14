import { join, basename } from "node:path/posix";

import fs from "fs-extra";

import { readSceneDirectories } from "../tools/scene.mjs";

import { compressFileToKtx } from "./assets/ktx.mjs";
import { extractNodeMaterialTextures } from "./assets/material.mjs";
import { getExtractedTextureOutputPath } from "./assets/texture.mjs";
import { extractNodeParticleSystemSetTextures, extractParticleSystemTextures } from "./assets/particle-system.mjs";

export interface ICreateBabylonSceneOptions {
	sceneFile: string;
	sceneName: string;
	publicDir: string;
	babylonjsEditorToolsVersion: string;
	exportedAssets: string[];
	optimize: boolean;
	compressedTexturesEnabled: boolean;

	config: any;
	directories: Awaited<ReturnType<typeof readSceneDirectories>>;
}

export async function createBabylonScene(options: ICreateBabylonSceneOptions) {
	const lights: any[] = [];
	const meshes: any[] = [];
	const cameras: any[] = [];
	const materials: any[] = [];
	const skeletons: any[] = [];
	const transformNodes: any[] = [];
	const particleSystems: any[] = [];
	const shadowGenerators: any[] = [];
	const morphTargetManagers: any[] = [];

	// Meshes
	const meshesResult = await Promise.all(
		options.directories.meshesFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "meshes", file));
			const mesh = data.meshes[0];

			if (mesh.metadata?.doNotSerialize) {
				return null;
			}

			if (mesh.delayLoadingFile) {
				mesh.delayLoadingFile = join(options.sceneName, basename(mesh.delayLoadingFile));
			}

			if (mesh.metadata?.parentId) {
				mesh.parentId = mesh.metadata.parentId;
			}

			mesh.instances?.forEach((instance) => {
				if (instance.metadata?.parentId) {
					instance.parentId = instance.metadata.parentId;
				}
			});

			mesh.instances = mesh.instances?.filter((instance) => {
				if (instance.metadata?.doNotSerialize) {
					return null;
				}

				return instance;
			});

			if (data.basePoseMatrix) {
				mesh.basePoseMatrix = data.basePoseMatrix;
			}

			let effectiveMaterial: any;

			data.materials?.forEach((material) => {
				const existingMaterial = materials.find((m) => m.id === material.id);
				if (!existingMaterial) {
					effectiveMaterial = material;
				}
			});

			// LODs
			let lodMeshes: any[] = [];
			if (data.lods) {
				mesh.lodMeshIds = [];
				mesh.lodDistances = [];

				const lodsResult = await Promise.all(
					data.lods?.map(async (lodFile) => {
						const lodData = await fs.readJSON(join(options.sceneFile, "lods", lodFile));
						const lodMesh = lodData.meshes[0];

						if (lodMesh.delayLoadingFile) {
							lodMesh.delayLoadingFile = join(options.sceneName, basename(lodMesh.delayLoadingFile));
						}

						if (data.basePoseMatrix) {
							lodMesh.basePoseMatrix = data.basePoseMatrix;
						}

						return {
							lodMesh,
							distanceOrScreenCoverage: lodData.distanceOrScreenCoverage,
						};
					})
				);

				lodsResult.forEach((lodData) => {
					lodMeshes.push(lodData.lodMesh);

					mesh.lodMeshIds.push(lodData.lodMesh.id);
					mesh.lodDistances.push(lodData.distanceOrScreenCoverage);
				});
			}

			return {
				mesh,
				lodMeshes,
				effectiveMaterial,
			};
		})
	);

	meshesResult.forEach((result) => {
		if (result) {
			meshes.push(result.mesh);

			result.lodMeshes.forEach((lodMesh) => {
				meshes.push(lodMesh);
			});

			if (result.effectiveMaterial) {
				materials.push(result.effectiveMaterial);
			}
		}
	});

	// Morph targets
	const morphTargetResult = await Promise.all(
		options.directories.morphTargetManagerFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "morphTargetManagers", file));

			if (options.babylonjsEditorToolsVersion >= "5.2.6") {
				data.targets.forEach((target) => {
					if (target.delayLoadingFile) {
						target.delayLoadingFile = join(options.sceneName, "morphTargets", basename(target.delayLoadingFile));
					}
				});
			} else {
				await Promise.all(
					data.targets.map(async (target) => {
						const binaryFileData = join(options.sceneFile, "morphTargets", basename(target.delayLoadingFile));
						const buffer = (await fs.readFile(binaryFileData)).buffer;

						if (target.positionsCount) {
							target.positions = Array.prototype.slice.call(new Float32Array(buffer, target.positionsOffset, target.positionsCount));
						}

						if (target.normalsCount) {
							target.normals = Array.prototype.slice.call(new Float32Array(buffer, target.normalsOffset, target.normalsCount));
						}

						if (target.tangentsCount) {
							target.tangents = Array.prototype.slice.call(new Float32Array(buffer, target.tangentsOffset, target.tangentsCount));
						}

						if (target.uvsCount) {
							target.uvs = Array.prototype.slice.call(new Float32Array(buffer, target.uvsOffset, target.uvsCount));
						}

						if (target.uv2sCount) {
							target.uv2s = Array.prototype.slice.call(new Float32Array(buffer, target.uv2sOffset, target.uv2sCount));
						}

						delete target.delayLoadingFile;

						delete target.positionsCount;
						delete target.normalsCount;
						delete target.tangentsCount;
						delete target.uvsCount;
						delete target.uv2sCount;

						delete target.positionsOffset;
						delete target.normalsOffset;
						delete target.tangentsOffset;
						delete target.uvsOffset;
						delete target.uv2sOffset;
					})
				);
			}

			return data;
		})
	);

	morphTargetManagers.push(...morphTargetResult);

	// Transform nodes
	const transformNodesResult = await Promise.all(
		options.directories.nodesFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "nodes", file));
			if (data.metadata?.doNotSerialize) {
				return null;
			}

			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			return data;
		})
	);

	transformNodes.push(
		...transformNodesResult.filter((transformNode) => {
			return transformNode !== null;
		})
	);

	const spriteManagersResult = await Promise.all(
		options.directories.spriteManagerFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "sprite-managers", file));

			if (data.metadata?.doNotSerialize) {
				return null;
			}

			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			return data;
		})
	);

	transformNodes.push(
		...spriteManagersResult.filter((spriteManager) => {
			return spriteManager !== null;
		})
	);

	const spriteMapsResult = await Promise.all(
		options.directories.spriteMapFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "sprite-maps", file));

			if (data.metadata?.doNotSerialize) {
				return null;
			}

			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			return data;
		})
	);

	transformNodes.push(
		...spriteMapsResult.filter((spriteMap) => {
			return spriteMap !== null;
		})
	);

	// Lights
	const lightsResult = await Promise.all(
		options.directories.lightsFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "lights", file));

			if (data.metadata?.doNotSerialize) {
				return null;
			}

			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			return data;
		})
	);

	lights.push(
		...lightsResult.filter((light) => {
			return light !== null;
		})
	);

	// Cameras
	const camerasResult = await Promise.all(
		options.directories.cameraFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "cameras", file));

			if (data.metadata?.doNotSerialize) {
				return null;
			}

			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			return data;
		})
	);

	cameras.push(
		...camerasResult.filter((camera) => {
			return camera !== null;
		})
	);

	// Extract materials
	const extractedTexturesOutputPath = getExtractedTextureOutputPath(options.publicDir);
	await fs.ensureDir(extractedTexturesOutputPath);

	await Promise.all(
		materials.map(async (material) => {
			if (material.customType === "BABYLON.NodeMaterial") {
				const result = await extractNodeMaterialTextures(material, {
					extractedTexturesOutputPath,
				});

				await Promise.all(
					result.map(async (relativePath) => {
						const finalPath = join(options.publicDir, relativePath);
						options.exportedAssets.push(finalPath);

						if (options.optimize && options.compressedTexturesEnabled) {
							await compressFileToKtx(finalPath, {
								...options,
								force: false,
								exportedAssets: options.exportedAssets,
							});
						}
					})
				);
			}
		})
	);

	// Extract particle systems
	const particleSystemsResult = await Promise.all(
		options.directories.particleSystemFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "particleSystems", file));

			if (data.metadata?.doNotSerialize) {
				return null;
			}

			const result = await extractParticleSystemTextures(data, {
				extractedTexturesOutputPath,
			});

			if (result) {
				const finalPath = join(options.publicDir, result);
				options.exportedAssets.push(finalPath);

				if (options.optimize && options.compressedTexturesEnabled) {
					await compressFileToKtx(finalPath, {
						...options,
						force: false,
						exportedAssets: options.exportedAssets,
					});
				}
			}

			return data;
		})
	);

	particleSystems.push(
		...particleSystemsResult.filter((ps) => {
			return ps !== null;
		})
	);

	// Extract node particle system sets
	const nodeParticleSystemSetsResult = await Promise.all(
		options.directories.nodeParticleSystemSetFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "nodeParticleSystemSets", file));

			if (data.metadata?.doNotSerialize) {
				return null;
			}

			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			if (data.nodeParticleSystemSet) {
				const result = await extractNodeParticleSystemSetTextures(data.nodeParticleSystemSet, {
					extractedTexturesOutputPath,
				});

				await Promise.all(
					result.map(async (relativePath) => {
						const finalPath = join(options.publicDir, relativePath);
						options.exportedAssets.push(finalPath);

						if (options.optimize && options.compressedTexturesEnabled) {
							await compressFileToKtx(finalPath, {
								...options,
								force: false,
								exportedAssets: options.exportedAssets,
							});
						}
					})
				);
			}

			return data;
		})
	);

	meshes.push(
		...nodeParticleSystemSetsResult.filter((node) => {
			return node !== null;
		})
	);

	// Shadow generators
	const shadowGeneratorsResult = await Promise.all(
		options.directories.shadowGeneratorFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "shadowGenerators", file));

			const light = lights.find((l) => l.id === data.lightId);
			if (!light) {
				return null;
			}

			return data;
		})
	);

	shadowGenerators.push(
		...shadowGeneratorsResult.filter((sg) => {
			return sg !== null;
		})
	);

	// Skeletons
	const skeletonsResult = await Promise.all(
		options.directories.skeletonFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "skeletons", file));
			const mesh = meshes.find((m) => m.skeletonId === data.id);
			if (!mesh) {
				return null;
			}

			return data;
		})
	);

	skeletons.push(
		...skeletonsResult.filter((skeleton) => {
			return skeleton !== null;
		})
	);

	const scene = {
		autoClear: true,
		clearColor: options.config.clearColor,
		ambientColor: options.config.ambientColor,

		gravity: options.config.gravity ?? [0, -9.81, 0],

		collisionsEnabled: true,
		useRightHandedSystem: false,

		fogMode: options.config.fog.fogMode,
		fogColor: options.config.fog.fogColor,
		fogStart: options.config.fog.fogStart,
		fogEnd: options.config.fog.fogEnd,
		fogDensity: options.config.fog.fogDensity,

		physicsEnabled: true,
		physicsGravity: options.config.physics.gravity,
		physicsEngine: "HavokPlugin",

		metadata: options.config.metadata,

		morphTargetManagers,
		lights,
		cameras,

		animations: options.config.animations,
		materials,
		multiMaterials: [],

		environmentTexture: options.config.environment.environmentTexture,
		environmentIntensity: options.config.environment.environmentIntensity,
		iblIntensity: options.config.environment.iblIntensity ?? 1,

		skeletons,
		transformNodes,

		geometries: {
			boxes: [],
			spheres: [],
			cylinders: [],
			toruses: [],
			grounds: [],
			planes: [],
			torusKnots: [],
			vertexData: [],
		},

		meshes,
		particleSystems,

		sounds: await Promise.all(
			options.directories.soundFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "sounds", file));
			})
		),

		shadowGenerators,

		animationGroups: await Promise.all(
			options.directories.animationGroupFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "animationGroups", file));
			})
		),

		postProcesses: [],
		spriteManagers: [],
		reflectionProbes: [],
	};

	// Resolve parenting for mesh instances.
	const allNodes = [...scene.meshes, ...scene.cameras, ...scene.lights, ...scene.transformNodes, ...scene.meshes.map((m) => m.instances ?? []).flat()];

	allNodes.forEach((node) => {
		if (node.parentId !== undefined && node.parentInstanceIndex !== undefined) {
			const effectiveMesh = scene.meshes.find((mesh) => {
				return mesh.instances?.find((instance) => instance.uniqueId === node.parentId);
			});

			if (effectiveMesh) {
				node.parentId = effectiveMesh.uniqueId;
			}
		}
	});

	// Write final scene file.
	const destination = join(options.publicDir, `${options.sceneName}.babylon`);
	await fs.writeJSON(destination, scene, {
		encoding: "utf-8",
		// spaces: "\t", // Useful for debug
	});

	options.exportedAssets.push(destination);
}
