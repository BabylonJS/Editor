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

	await Promise.all(
		options.directories.meshesFiles.map(async (file) => {
			const data = await fs.readJSON(join(options.sceneFile, "meshes", file));

			data.meshes.forEach((mesh) => {
				if (mesh.delayLoadingFile) {
					mesh.delayLoadingFile = join(options.sceneName, basename(mesh.delayLoadingFile));
				}
			});

			meshes.push(...data.meshes);

			data.materials.forEach((material) => {
				const existingMaterial = materials.find((m) => m.id === material.id);
				if (!existingMaterial) {
					materials.push(material);
				}
			});
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

		meshes,
		materials,
		skeletons: await Promise.all(
			options.directories.skeletonFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "skeletons", file));
			})
		),
		transformNodes: await Promise.all(
			options.directories.nodesFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "nodes", file));
			})
		),
		cameras: await Promise.all(
			options.directories.cameraFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "cameras", file));
			})
		),
		lights: await Promise.all(
			options.directories.lightsFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "lights", file));
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
		morphTargetManagers: await Promise.all(
			options.directories.morphTargetManagerFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "morphTargetManagers", file));
			})
		),
		animationGroups: await Promise.all(
			options.directories.animationGroupFiles.map(async (file) => {
				return fs.readJSON(join(options.sceneFile, "animationGroups", file));
			})
		),
	};

	await fs.writeJSON(join(options.publicDir, `${options.sceneName}.babylon`), scene, {
		encoding: "utf-8",
		spaces: "\t",
	});
}
