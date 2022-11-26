import { Nullable } from "../../../../../shared/types";

import {
    Camera, DirectionalLight, InstancedMesh, IParticleSystem, Light, Mesh, Node, PointLight, ReflectionProbe,
    Scene, Sound, SpotLight, TargetCamera, TransformNode,
} from "babylonjs";

/**
 * Returns the current if of the given node. Returns null is unknown node type.
 * @param object defines the reference to the object to test its class name.
 */
export function getNodeId(object: any): Nullable<string> {
    if (isNode(object) || isIParticleSystem(object)) {
        return object.id;
    }

    if (isSound(object)) {
        return object.metadata?.id ?? null;
    }

    if (isReflectionProbe(object)) {
        return object["metadata"]?.id ?? null;
    }

    return null;
}

/**
 * Returns wether or not the given object is draggable in the graph.
 * @param object defines the reference to the object to test its class name.
 */
export function isDraggable(object: any): boolean {
    return isNode(object) || isIParticleSystem(object) || isSound(object) || isReflectionProbe(object);
}

/**
 * Returns wether or not the given object is a Sound.
 * @param object defines the reference to the object to test its class name.
 */
export function isSound(object: any): object is Sound {
    return object.getClassName?.() === "Sound";
}

/**
 * Returns wether or not the given object is a ReflectionProbe.
 * @param object defines the reference to the object to test its class name.
 */
export function isReflectionProbe(object: any): object is ReflectionProbe {
    return object.getClassName?.() === "ReflectionProbe";
}

/**
 * Returns wether or not the given object is a Node.
 * @param object defines the reference to the object to test its class name.
 */
export function isNode(object: any): object is Node {
    return isAbstractMesh(object) || isTransformNode(object) || isLight(object) || isCamera(object);
}

/**
 * Returns wether or not the given object is a TransformNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isTransformNode(object: any): object is TransformNode {
    return object.getClassName?.() === "TransformNode";
}

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
    return object.getClassName?.() === "Mesh";
}

/**
 * Returns wether or not the given object is a InstancedMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isInstancedMesh(object: any): object is InstancedMesh {
    return object.getClassName?.() === "InstancedMesh";
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
 * Returns wether or not the given object is a DirectionalLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isDirectionalLight(object: any): object is DirectionalLight {
    return object.getClassName?.() === "DirectionalLight";
}

/**
 * Returns wether or not the given object is a PointLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isPointLight(object: any): object is PointLight {
    return object.getClassName?.() === "PointLight";
}

/**
 * Returns wether or not the given object is a SpotLight.
 * @param object defines the reference to the object to test its class name.
 */
export function isSpotLight(object: any): object is SpotLight {
    return object.getClassName?.() === "SpotLight";
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
 * Returns wether or not the given object is a TargetCamera.
 * @param object defines the reference to the object to test its class name.
 */
export function isTargetCamera(object: any): object is TargetCamera {
    switch (object.getClassName?.()) {
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
 * Returns wether or not the given object is a IParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isIParticleSystem(object: any): object is IParticleSystem {
    return object.getClassName?.() === "ParticleSystem" || object.getClassName?.() === "GPUParticleSystem";
}

/**
 * Returns wether or not the given object is a Scene.
 * @param object defines the reference to the object to test its class name.
 */
export function isScene(object: any): object is Scene {
    return object.getClassName?.() === "Scene";
}

/**
 * Returns the list of all root nodes for the given array of nodes.
 * @param nodes defines the reference to the array of nodes to get only top parents.
 */
export function getRootNodes(nodes: Node[]): Node[] {
    const rootNodes: Node[] = [];

    nodes.forEach((n) => {
        let node = n;
        while (node) {
            if ((!node.parent || nodes.indexOf(node.parent) === -1)) {
                if (rootNodes.indexOf(node) === -1) {
                    rootNodes.push(node);
                }
                break;
            }

            node = node.parent!;
        }
    });

    return rootNodes;
}
