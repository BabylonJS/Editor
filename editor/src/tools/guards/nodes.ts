import {
	Bone, Camera, GroundMesh, Light, Mesh, Node, PointLight, TransformNode,
	DirectionalLight, InstancedMesh, FreeCamera, ArcRotateCamera, SpotLight, HemisphericLight,
} from "babylonjs";

import { EditorCamera } from "../../editor/nodes/camera";
import { CollisionMesh } from "../../editor/nodes/collision";

import { isSceneLinkNode } from "./scene";

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
 * Returns wether or not the given object is a CollisionMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isCollisionMesh(object: any): object is CollisionMesh {
	return object.getClassName?.() === "CollisionMesh";
}

/**
 * Returns wether or not the given object is an InstancedMesh of CollisionMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isCollisionInstancedMesh(object: any): object is InstancedMesh {
	return isInstancedMesh(object) && isCollisionMesh(object.sourceMesh);
}

/**
 * Returns wether or not the given object is a TransformNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isTransformNode(object: any): object is TransformNode {
	return object.getClassName?.() === "TransformNode";
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
 * Returns wether or not the given object is a EditorCamera.
 * @param object defines the reference to the object to test its class name.
 */
export function isEditorCamera(object: any): object is EditorCamera {
	return object.getClassName?.() === "EditorCamera";
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
	return isAbstractMesh(object) || isTransformNode(object) || isLight(object) || isCamera(object) || isSceneLinkNode(object);
}
