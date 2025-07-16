import { Scene } from "@babylonjs/core/scene";

import { Node } from "@babylonjs/core/node";
import { Bone } from "@babylonjs/core/Bones/bone";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GroundMesh } from "@babylonjs/core/Meshes/groundMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

import { Light } from "@babylonjs/core/Lights/light";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { IParticleSystem } from "@babylonjs/core/Particles/IParticleSystem";
import { GPUParticleSystem } from "@babylonjs/core/Particles/gpuParticleSystem";

/**
 * Returns wether or not the given object is an AbstractMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isAbstractMesh(object: any): object is Mesh {
	switch (object.getClassName?.()) {
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
	switch (object.getClassName?.()) {
		case "Mesh":
		case "GroundMesh":
			return true;
	}

	return false;
}

/**
 * Returns wether or not the given object is a InstancedMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isInstancedMesh(object: any): object is InstancedMesh {
	return object.getClassName?.() === "InstancedMesh";
}

/**
 * Returns wether or not the given object is a Bone.
 * @param object defines the reference to the object to test its class name.
 */
export function isBone(object: any): object is Bone {
	return object.getClassName?.() === "Bone";
}

/**
 * Returns wether or not the given object is a GroundMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isGroundMesh(object: any): object is GroundMesh {
	return object.getClassName?.() === "GroundMesh";
}

/**
 * Returns wether or not the given object is a TransformNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isTransformNode(object: any): object is TransformNode {
	return object.getClassName?.() === "TransformNode";
}

/**
 * Returns wether or not the given object is a Texture.
 * @param object defines the reference to the object to test its class name.
 */
export function isTexture(object: any): object is Texture {
	return object?.getClassName?.() === "Texture";
}

/**
 * Returns wether or not the given object is a Camera.
 * @param object defines the reference to the object to test its class name.
 */
export function isCamera(object: any): object is Camera {
	switch (object.getClassName?.()) {
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
	switch (object.getClassName?.()) {
		case "FreeCamera":
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
	return object.getClassName?.() === "ArcRotateCamera";
}

/**
 * Returns wether or not the given object is a PointLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isPointLight(object: any): object is PointLight {
	return object.getClassName?.() === "PointLight";
}

/**
 * Returns wether or not the given object is a DirectionalLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isDirectionalLight(object: any): object is DirectionalLight {
	return object.getClassName?.() === "DirectionalLight";
}

/**
 * Returns wether or not the given object is a SpotLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isSpotLight(object: any): object is SpotLight {
	return object.getClassName?.() === "SpotLight";
}

/**
 * Returns wether or not the given object is a HemisphericLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isHemisphericLight(object: any): object is HemisphericLight {
	return object.getClassName?.() === "HemisphericLight";
}

/**
 * Returns wether or not the given object is a Light.
 * @param object defines the reference to the object to test its class name.
 */
export function isLight(object: any): object is Light {
	switch (object.getClassName?.()) {
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
 * Returns wether or not the given object is a Node.
 * @param object defines the reference to the object to test its class name.
 */
export function isNode(object: any): object is Node {
	return isAbstractMesh(object) || isTransformNode(object) || isLight(object) || isCamera(object);
}

/**
 * Returns wether or not the given object is a Scene.
 * @param object defines the reference to the object to test its class name.
 */
export function isScene(object: any): object is Scene {
	return object.getClassName?.() === "Scene";
}

/**
 * Returns wether or not the given object is a ParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isParticleSystem(object: any): object is ParticleSystem {
	return object.getClassName?.() === "ParticleSystem";
}

/**
 * Returns wether or not the given object is a GPUParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isGPUParticleSystem(object: any): object is GPUParticleSystem {
	return object.getClassName?.() === "GPUParticleSystem";
}

/**
 * Returns wether or not the given object is a IParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isAnyParticleSystem(object: any): object is IParticleSystem {
	switch (object.getClassName?.()) {
		case "ParticleSystem":
		case "GPUParticleSystem":
			return true;
	}

	return false;
}
