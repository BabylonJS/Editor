import {
	ArcRotateCamera,
	Camera,
	ClusteredLightContainer,
	DirectionalLight,
	FreeCamera,
	GaussianSplattingMesh,
	HemisphericLight,
	LightBase,
	Mesh,
	ParticleSystem,
	PointLight,
	SceneContext,
	SceneNode,
	ShadowGenerator,
	SpotLight,
	Texture2D,
	TransformNode,
} from "@babylonjs/lite";

import { SoundNode } from "./sound";
import { Sprite, SpriteManagerNode } from "./sprite";

/**
 * Babylon Lite objects are plain data without class names. The class names of the objects created by the tools while
 * loading a scene (meshes, instances, sound nodes, sprite managers, etc.) are stored here so the guards can tell them apart.
 */
const classNames = new WeakMap<object, string>();

/**
 * Sets the class name of the given object, as returned by `getClassName`.
 * @param object defines the reference to the object to set the class name.
 * @param className defines the class name of the object (ie. "Mesh", "SoundNode", etc.).
 */
export function setClassName(object: object, className: string): void {
	classNames.set(object, className);
}

/**
 * Returns the class name of the given object. The class name is the one set by the tools while loading the scene
 * (ie. "InstancedMesh", "SoundNode", "UniversalCamera", etc.) or, for the objects created directly using Babylon Lite,
 * the class name of the Babylon.js object they are the equivalent of (ie. "Mesh", "TransformNode", "PointLight", etc.).
 * @param object defines the reference to the object to get the class name.
 * @returns the class name of the object or null if it is unknown.
 */
export function getClassName(object: any): string | null {
	if (!object || typeof object !== "object") {
		return null;
	}

	const className = classNames.get(object);
	if (className) {
		return className;
	}

	switch (object.lightType) {
		case "point":
			return "PointLight";
		case "spot":
			return "SpotLight";
		case "directional":
			return "DirectionalLight";
		case "hemispheric":
			return "HemisphericLight";
	}

	if (object.kind === "clusteredLightContainer") {
		return "ClusteredLightContainer";
	}

	if ("nearPlane" in object && "farPlane" in object && "fov" in object) {
		return "alpha" in object && "beta" in object && "radius" in object ? "ArcRotateCamera" : "FreeCamera";
	}

	if ("material" in object && "receiveShadows" in object) {
		return "Mesh";
	}

	if ("surface" in object && "meshes" in object && "lights" in object) {
		return "Scene";
	}

	if ("texture" in object && "view" in object && "sampler" in object && "width" in object) {
		return "Texture";
	}

	if ("position" in object && "rotationQuaternion" in object && "scaling" in object && "children" in object) {
		return "TransformNode";
	}

	return null;
}

/**
 * Returns wether or not the given object is an AbstractMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isAbstractMesh(object: any): object is Mesh {
	switch (getClassName(object)) {
		case "Mesh":
		case "LineMesh":
		case "GroundMesh":
		case "InstancedMesh":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a Mesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isMesh(object: any): object is Mesh {
	switch (getClassName(object)) {
		case "Mesh":
		case "GroundMesh":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a InstancedMesh.
 * Babylon Lite doesn't support instanced meshes: the instances created in the editor are loaded as meshes
 * sharing the geometry and material of their source mesh, available through the `sourceMesh` property.
 * @param object defines the reference to the object to test its class name.
 */
export function isInstancedMesh(object: any): object is Mesh & { sourceMesh: Mesh } {
	return getClassName(object) === "InstancedMesh";
}

/**
 * Returns wether or not the given object is a Bone.
 * @param object defines the reference to the object to test its class name.
 */
export function isBone(object: any): boolean {
	return getClassName(object) === "Bone";
}

/**
 * Returns wether or not the given object is a GroundMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isGroundMesh(object: any): object is Mesh {
	return getClassName(object) === "GroundMesh";
}

/**
 * Returns wether or not the given object is a TransformNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isTransformNode(object: any): object is TransformNode {
	return getClassName(object) === "TransformNode";
}

/**
 * Returns wether or not the given object is a Texture.
 * @param object defines the reference to the object to test its class name.
 */
export function isTexture(object: any): object is Texture2D {
	return getClassName(object) === "Texture";
}

/**
 * Returns wether or not the given object is a Camera.
 * @param object defines the reference to the object to test its class name.
 */
export function isCamera(object: any): object is Camera {
	switch (getClassName(object)) {
		case "Camera":
		case "FreeCamera":
		case "TargetCamera":
		case "EditorCamera":
		case "ArcRotateCamera":
		case "UniversalCamera":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a FreeCamera.
 * @param object defines the reference to the object to test its class name.
 */
export function isFreeCamera(object: any): object is FreeCamera {
	switch (getClassName(object)) {
		case "FreeCamera":
		case "TargetCamera":
		case "UniversalCamera":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a ArcRotateCamera.
 * @param object defines the reference to the object to test its class name.
 */
export function isArcRotateCamera(object: any): object is ArcRotateCamera {
	return getClassName(object) === "ArcRotateCamera";
}

/**
 * Returns wether or not the given object is a PointLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isPointLight(object: any): object is PointLight {
	return getClassName(object) === "PointLight";
}

/**
 * Returns wether or not the given object is a DirectionalLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isDirectionalLight(object: any): object is DirectionalLight {
	return getClassName(object) === "DirectionalLight";
}

/**
 * Returns wether or not the given object is a SpotLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isSpotLight(object: any): object is SpotLight {
	return getClassName(object) === "SpotLight";
}

/**
 * Returns wether or not the given object is a HemisphericLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isHemisphericLight(object: any): object is HemisphericLight {
	return getClassName(object) === "HemisphericLight";
}

/**
 * Returns wether or not the given object is a Light.
 * @param object defines the reference to the object to test its class name.
 */
export function isLight(object: any): object is LightBase {
	switch (getClassName(object)) {
		case "Light":
		case "PointLight":
		case "SpotLight":
		case "DirectionalLight":
		case "HemisphericLight":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a ShadowGenerator.
 * @param object defines the reference to the object to test its class name.
 */
export function isShadowGenerator(object: any): object is ShadowGenerator {
	return getClassName(object) === "ShadowGenerator";
}

/**
 * Returns wether or not the given object is a CascadedShadowGenerator.
 * @param object defines the reference to the object to test its class name.
 */
export function isCascadedShadowGenerator(object: any): object is ShadowGenerator {
	return getClassName(object) === "CascadedShadowGenerator";
}

/**
 * Returns wether or not the given object is a ClusteredLightContainer.
 * @param object defines the reference to the object to test its class name.
 */
export function isClusteredLightContainer(object: any): object is ClusteredLightContainer {
	return getClassName(object) === "ClusteredLightContainer";
}

/**
 * Returns wether or not the given object is a Node.
 * @param object defines the reference to the object to test its class name.
 */
export function isNode(object: any): object is SceneNode | Camera {
	return isAbstractMesh(object) || isTransformNode(object) || isLight(object) || isCamera(object);
}

/**
 * Returns wether or not the given object is a Scene.
 * @param object defines the reference to the object to test its class name.
 */
export function isScene(object: any): object is SceneContext {
	return getClassName(object) === "Scene";
}

/**
 * Returns wether or not the given object is a ParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isParticleSystem(object: any): object is ParticleSystem {
	return getClassName(object) === "ParticleSystem";
}

/**
 * Returns wether or not the given object is a GPUParticleSystem.
 * Babylon Lite doesn't support GPU particle systems: always returns false.
 * @param object defines the reference to the object to test its class name.
 */
export function isGPUParticleSystem(object: any): boolean {
	return getClassName(object) === "GPUParticleSystem";
}

/**
 * Returns wether or not the given object is a IParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isAnyParticleSystem(object: any): object is ParticleSystem {
	switch (getClassName(object)) {
		case "ParticleSystem":
		case "GPUParticleSystem":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a SpriteManagerNode.
 * @param object defines the reference to the object to test its class name.
 * @returns true if the object is a SpriteManagerNode, false otherwise.
 */
export function isSpriteManagerNode(object: any): object is SpriteManagerNode {
	return getClassName(object) === "SpriteManagerNode";
}

/**
 * Returns wether or not the given object is a Sprite.
 * @param object defines the reference to the object to test its class name.
 */
export function isSprite(object: any): object is Sprite {
	return getClassName(object) === "Sprite";
}

/**
 * Returns wether or not the given object is a SoundNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isSoundNode(object: any): object is SoundNode {
	return getClassName(object) === "SoundNode";
}

/**
 * Returns wether or not the given object is a GaussianSplattingMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isGaussianSplattingMesh(object: any): object is GaussianSplattingMesh {
	return getClassName(object) === "GaussianSplattingMesh";
}
