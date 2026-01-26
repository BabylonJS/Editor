import { join, basename } from "node:path/posix";

import fs from "fs-extra";

import { readSceneDirectories } from "../tools/scene.mjs";

import { extractNodeMaterialTextures } from "./assets/material.mjs";
import { getExtractedTextureOutputPath, processExportedTexture } from "./assets/texture.mjs";
import { extractNodeParticleSystemSetTextures, extractParticleSystemTextures } from "./assets/particle-system.mjs";

export interface ICreateBabylonSceneOptions {
	sceneFile: string;
	sceneName: string;
	publicDir: string;
	babylonjsEditorToolsVersion: string;

	exportedAssets: string[];

	config: any;
	directories: Awaited<ReturnType<typeof readSceneDirectories>>;
}

export async function createBabylonScene(options: ICreateBabylonSceneOptions) {
	const meshes: any[] = [];
	const materials: any[] = [];
	const transformNodes: any[] = [];
	const morphTargetManagers: any[] = [];

	// Meshes
	await Promise.all(
		options.directories.meshesFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "meshes", file));
			const mesh = data.meshes[0];

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

			if (data.basePoseMatrix) {
				mesh.basePoseMatrix = data.basePoseMatrix;
			}

			meshes.push(mesh);

			data.materials?.forEach((material) => {
				const existingMaterial = materials.find((m) => m.id === material.id);
				if (!existingMaterial) {
					materials.push(material);
				}
			});
		})
	);

	// Morph targets
	await Promise.all(
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

			morphTargetManagers.push(data);
		})
	);

	// Transform nodes
	await Promise.all(
		options.directories.nodesFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "nodes", file));
			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			transformNodes.push(data);
		})
	);

	await Promise.all(
		options.directories.spriteManagerFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "sprite-managers", file));
			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			transformNodes.push(data);
		})
	);

	await Promise.all(
		options.directories.spriteMapFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "sprite-maps", file));
			if (data.metadata?.parentId) {
				data.parentId = data.metadata.parentId;
			}

			transformNodes.push(data);
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

						await processExportedTexture(finalPath, {
							force: true,
							exportedAssets: options.exportedAssets,
						});
					})
				);
			}
		})
	);

	// Particle systems
	const particleSystems = await Promise.all(
		options.directories.particleSystemFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "particleSystems", file));

			const result = await extractParticleSystemTextures(data, {
				extractedTexturesOutputPath,
			});

			if (result) {
				const finalPath = join(options.publicDir, result);
				options.exportedAssets.push(finalPath);

				await processExportedTexture(finalPath, {
					force: true,
					exportedAssets: options.exportedAssets,
				});
			}

			return data;
		})
	);

	// Node particle system sets
	await Promise.all(
		options.directories.nodeParticleSystemSetFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "nodeParticleSystemSets", file));

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

						await processExportedTexture(finalPath, {
							force: true,
							exportedAssets: options.exportedAssets,
						});
					})
				);
			}

			meshes.push(data);
		})
	);

	const scene = {
		autoClear: true,
		physicsEnabled: true,
		collisionsEnabled: true,
		useRightHandedSystem: false,
		physicsEngine: "HavokPlugin",
		iblIntensity: 1,

		clearColor: options.config.clearColor,
		ambientColor: options.config.ambientColor,

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

		gravity: options.config.gravity ?? [0, -9.81, 0],

		fogColor: options.config.fog.fogColor,
		fogStart: options.config.fog.fogStart,
		fogEnd: options.config.fog.fogEnd,
		fogDensity: options.config.fog.fogDensity,
		fogMode: options.config.fog.fogMode,

		physicsGravity: options.config.physics.gravity,

		environmentIntensity: options.config.environment.environmentIntensity,
		environmentTexture: options.config.environment.environmentTexture,

		metadata: options.config.metadata,

		animations: options.config.animations,

		postProcesses: [],
		multiMaterials: [],
		spriteManagers: [],
		reflectionProbes: [],

		meshes,
		materials,
		morphTargetManagers,
		transformNodes,
		particleSystems,

		animationGroups: await Promise.all(
			options.directories.animationGroupFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "animationGroups", file));
			})
		),
		skeletons: await Promise.all(
			options.directories.skeletonFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "skeletons", file));
			})
		),
		cameras: await Promise.all(
			options.directories.cameraFiles.map(async (file) => {
				const data = await fs.readJSON(join(options.sceneFile, "cameras", file));
				if (data.metadata?.parentId) {
					data.parentId = data.metadata.parentId;
				}

				return data;
			})
		),
		lights: await Promise.all(
			options.directories.lightsFiles.map(async (file) => {
				const data = await fs.readJSON(join(options.sceneFile, "lights", file));
				if (data.metadata?.parentId) {
					data.parentId = data.metadata.parentId;
				}

				return data;
			})
		),
		shadowGenerators: await Promise.all(
			options.directories.shadowGeneratorFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "shadowGenerators", file));
			})
		),
		sounds: await Promise.all(
			options.directories.soundFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "sounds", file));
			})
		),
	};

	const destination = join(options.publicDir, `${options.sceneName}.babylon`);
	await fs.writeJSON(destination, scene, {
		encoding: "utf-8",
		// spaces: "\t", // Useful for debug
	});

	options.exportedAssets.push(destination);
}
