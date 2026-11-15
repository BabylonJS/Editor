import { describe, expect, test } from "vitest";

import {
	getClassName,
	isAbstractMesh,
	isAnyParticleSystem,
	isArcRotateCamera,
	isBone,
	isCamera,
	isClusteredLightContainer,
	isDirectionalLight,
	isFreeCamera,
	isGPUParticleSystem,
	isGroundMesh,
	isHemisphericLight,
	isInstancedMesh,
	isLight,
	isMesh,
	isParticleSystem,
	isPointLight,
	isScene,
	isSoundNode,
	isSpotLight,
	isSprite,
	isTexture,
	isTransformNode,
	setClassName,
} from "../../src/tools/guards";

function withClassName(className: string): object {
	const object = {};
	setClassName(object, className);
	return object;
}

describe("tools/guards", () => {
	describe("getClassName", () => {
		test("should return the class name set by the tools", () => {
			expect(getClassName(withClassName("SoundNode"))).toBe("SoundNode");
		});

		test("should deduce the class name of the Babylon Lite objects from their shape", () => {
			expect(getClassName({ lightType: "point" })).toBe("PointLight");
			expect(getClassName({ lightType: "spot" })).toBe("SpotLight");
			expect(getClassName({ lightType: "directional" })).toBe("DirectionalLight");
			expect(getClassName({ lightType: "hemispheric" })).toBe("HemisphericLight");

			expect(getClassName({ fov: 0.8, nearPlane: 1, farPlane: 1000, alpha: 0, beta: 0, radius: 1 })).toBe("ArcRotateCamera");
			expect(getClassName({ fov: 0.8, nearPlane: 1, farPlane: 1000 })).toBe("FreeCamera");

			expect(getClassName({ material: null, receiveShadows: false })).toBe("Mesh");
			expect(getClassName({ position: {}, rotationQuaternion: {}, scaling: {}, children: [] })).toBe("TransformNode");
		});

		test("should return null for unknown objects", () => {
			expect(getClassName({})).toBeNull();
			expect(getClassName(null)).toBeNull();
			expect(getClassName(42)).toBeNull();
		});
	});

	describe("isAbstractMesh", () => {
		test("should return a boolean indicated if the passed object is a mesh or not", () => {
			expect(isAbstractMesh(withClassName("Mesh"))).toBeTruthy();
			expect(isAbstractMesh(withClassName("LineMesh"))).toBeTruthy();
			expect(isAbstractMesh(withClassName("GroundMesh"))).toBeTruthy();
			expect(isAbstractMesh(withClassName("InstancedMesh"))).toBeTruthy();
			expect(isAbstractMesh(withClassName("UnknownClass"))).toBeFalsy();
		});
	});

	describe("isMesh", () => {
		test("should return a boolean indicated if the passed object is a mesh or not", () => {
			expect(isMesh(withClassName("Mesh"))).toBeTruthy();
			expect(isMesh(withClassName("GroundMesh"))).toBeTruthy();
			expect(isMesh(withClassName("AbstractMesh"))).toBeFalsy();
			expect(isMesh(withClassName("InstancedMesh"))).toBeFalsy();
		});
	});

	describe("isGroundMesh / isInstancedMesh / isBone", () => {
		test("should check the class name", () => {
			expect(isGroundMesh(withClassName("GroundMesh"))).toBeTruthy();
			expect(isGroundMesh(withClassName("Mesh"))).toBeFalsy();

			expect(isInstancedMesh(withClassName("InstancedMesh"))).toBeTruthy();
			expect(isInstancedMesh(withClassName("Mesh"))).toBeFalsy();

			expect(isBone(withClassName("Bone"))).toBeTruthy();
			expect(isBone(withClassName("Mesh"))).toBeFalsy();
		});
	});

	describe("isTransformNode", () => {
		test("should return a boolean indicated if the passed object is a transform node or not", () => {
			expect(isTransformNode(withClassName("TransformNode"))).toBeTruthy();
			expect(isTransformNode({ position: {}, rotationQuaternion: {}, scaling: {}, children: [] })).toBeTruthy();
			expect(isTransformNode(withClassName("Mesh"))).toBeFalsy();
		});
	});

	describe("cameras", () => {
		test("should check the class names of the cameras", () => {
			expect(isCamera(withClassName("FreeCamera"))).toBeTruthy();
			expect(isCamera(withClassName("UniversalCamera"))).toBeTruthy();
			expect(isCamera(withClassName("ArcRotateCamera"))).toBeTruthy();
			expect(isCamera(withClassName("Mesh"))).toBeFalsy();

			expect(isFreeCamera(withClassName("FreeCamera"))).toBeTruthy();
			expect(isFreeCamera(withClassName("UniversalCamera"))).toBeTruthy();
			expect(isFreeCamera(withClassName("ArcRotateCamera"))).toBeFalsy();

			expect(isArcRotateCamera(withClassName("ArcRotateCamera"))).toBeTruthy();
			expect(isArcRotateCamera(withClassName("FreeCamera"))).toBeFalsy();
		});
	});

	describe("lights", () => {
		test("should check the types of the lights", () => {
			expect(isPointLight({ lightType: "point" })).toBeTruthy();
			expect(isPointLight({ lightType: "spot" })).toBeFalsy();

			expect(isSpotLight({ lightType: "spot" })).toBeTruthy();
			expect(isDirectionalLight({ lightType: "directional" })).toBeTruthy();
			expect(isHemisphericLight({ lightType: "hemispheric" })).toBeTruthy();

			expect(isLight({ lightType: "point" })).toBeTruthy();
			expect(isLight(withClassName("Mesh"))).toBeFalsy();
		});
	});

	describe("other objects", () => {
		test("should check the class names", () => {
			expect(isTexture(withClassName("Texture"))).toBeTruthy();
			expect(isScene(withClassName("Scene"))).toBeTruthy();
			expect(isSoundNode(withClassName("SoundNode"))).toBeTruthy();
			expect(isSprite(withClassName("Sprite"))).toBeTruthy();
			expect(isClusteredLightContainer(withClassName("ClusteredLightContainer"))).toBeTruthy();

			expect(isParticleSystem(withClassName("ParticleSystem"))).toBeTruthy();
			expect(isGPUParticleSystem(withClassName("GPUParticleSystem"))).toBeTruthy();
			expect(isAnyParticleSystem(withClassName("ParticleSystem"))).toBeTruthy();
			expect(isAnyParticleSystem(withClassName("Mesh"))).toBeFalsy();
		});
	});
});
