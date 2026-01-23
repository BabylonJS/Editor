import { join, basename } from "node:path/posix";

import fs from "fs-extra";

import { readSceneDirectories } from "../tools/scene.mjs";

export interface ICreateBabylonSceneParams {
	sceneFile: string;
	sceneName: string;
	publicDir: string;

	config: any;
	directories: Awaited<ReturnType<typeof readSceneDirectories>>;
}

export async function createBabylonScene(options: ICreateBabylonSceneParams) {
	const meshes: any[] = [];
	const materials: any[] = [];
	const morphTargetManagers: any[] = [];

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

			data.materials.forEach((material) => {
				const existingMaterial = materials.find((m) => m.id === material.id);
				if (!existingMaterial) {
					materials.push(material);
				}
			});
		})
	);

	await Promise.all(
		options.directories.morphTargetManagerFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "morphTargetManagers", file));

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

			// TODO: allow incremental loading of morph target data
			// data.targets.forEach((target) => {
			// 	if (target.delayLoadingFile) {
			// 		target.delayLoadingFile = join(options.sceneName, "morphTargets", basename(target.delayLoadingFile));
			// 	}
			// });

			morphTargetManagers.push(data);
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
		transformNodes: await Promise.all(
			options.directories.nodesFiles.map(async (file) => {
				const data = await fs.readJSON(join(options.sceneFile, "nodes", file));
				if (data.metadata?.parentId) {
					data.parentId = data.metadata.parentId;
				}

				return data;
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
		particleSystems: await Promise.all(
			options.directories.particleSystemFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "particleSystems", file));
			})
		),
		sounds: await Promise.all(
			options.directories.soundFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "sounds", file));
			})
		),
	};

	await fs.writeJSON(join(options.publicDir, `${options.sceneName}.babylon`), scene, {
		encoding: "utf-8",
		// spaces: "\t", // Useful for debug
	});
}
