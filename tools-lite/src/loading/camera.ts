import {
	ArcRotateCamera,
	attachControl,
	attachFreeControl,
	Camera,
	createArcRotateCamera,
	createFreeCamera,
	enableOrthographicCamera,
	FreeCamera,
	SceneContext,
	setCameraLimits,
} from "@babylonjs/lite";

import { babylonEulerToQuaternion } from "../tools/maths";
import { isArcRotateCamera, isFreeCamera, setClassName } from "../tools/guards";

/**
 * Rotates the vector (0, 0, 1) by the given quaternion.
 */
function getForwardDirection(q: [number, number, number, number]): [number, number, number] {
	const [x, y, z, w] = q;

	// Third column of the rotation matrix of the quaternion.
	return [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];
}

function applyCommonProperties(camera: Camera, data: any): void {
	camera.name = data.name;
	camera.id = data.id;
	camera.uniqueId = data.uniqueId;
	camera.metadata = data.metadata ?? {};

	camera.fov = data.fov ?? 0.8;
	camera.nearPlane = data.minZ ?? 1;
	camera.farPlane = data.maxZ ?? 10000;

	if (data.mode === 1) {
		enableOrthographicCamera(camera, {
			left: data.orthoLeft ?? null,
			right: data.orthoRight ?? null,
			bottom: data.orthoBottom ?? null,
			top: data.orthoTop ?? null,
		});
	}

	if (data.viewport) {
		camera.viewport = {
			x: data.viewport.x ?? 0,
			y: data.viewport.y ?? 0,
			width: data.viewport.width ?? 1,
			height: data.viewport.height ?? 1,
		};
	}
}

/**
 * Parses the given serialized Babylon.js camera and creates the equivalent Babylon Lite camera. Free, universal and
 * target cameras are loaded as free cameras (looking along their rotation), arc rotate cameras as arc rotate cameras.
 * @param data defines the serialized camera.
 * @returns the created camera or null if the type of the camera is not supported.
 */
export function parseCamera(data: any): Camera | null {
	switch (data.type) {
		case "ArcRotateCamera": {
			const target = data.target ?? [0, 0, 0];
			const camera = createArcRotateCamera(data.alpha ?? 0, data.beta ?? 0, data.radius ?? 1, { x: target[0], y: target[1], z: target[2] });

			camera.inertia = data.inertia ?? 0.9;
			camera.panningInertia = data.panningInertia ?? 0.9;
			camera.angularSensibility = data.angularSensibilityX ?? 1000;
			camera.panningSensibility = data.panningSensibility ?? 1000;
			camera.wheelPrecision = data.wheelPrecision ?? 3;

			const limits = {
				lowerAlphaLimit: data.lowerAlphaLimit ?? undefined,
				upperAlphaLimit: data.upperAlphaLimit ?? undefined,
				lowerBetaLimit: data.lowerBetaLimit ?? undefined,
				upperBetaLimit: data.upperBetaLimit ?? undefined,
				lowerRadiusLimit: data.lowerRadiusLimit ?? undefined,
				upperRadiusLimit: data.upperRadiusLimit ?? undefined,
			};

			if (Object.values(limits).some((value) => value !== undefined)) {
				setCameraLimits(camera, limits);
			}

			applyCommonProperties(camera, data);
			setClassName(camera, "ArcRotateCamera");

			return camera;
		}

		case "Camera":
		case "TargetCamera":
		case "FreeCamera":
		case "UniversalCamera":
		case "TouchCamera":
		case "GamepadCamera": {
			const position = data.position ?? [0, 0, 0];

			let target: [number, number, number];
			if (data.lockedTargetId === undefined && data.target && !data.rotation) {
				target = [data.target[0], data.target[1], data.target[2]];
			} else {
				const rotation = data.rotation ?? [0, 0, 0];
				const forward = getForwardDirection(babylonEulerToQuaternion(rotation[0], rotation[1], rotation[2]));
				target = [position[0] + forward[0], position[1] + forward[1], position[2] + forward[2]];
			}

			const camera = createFreeCamera({ x: position[0], y: position[1], z: position[2] }, { x: target[0], y: target[1], z: target[2] });

			camera.speed = data.speed ?? 2;
			camera.inertia = data.inertia ?? 0.9;
			camera.angularSensitivity = data.angularSensibility ?? 2000;

			applyCommonProperties(camera, data);
			setClassName(camera, data.type === "Camera" ? "FreeCamera" : data.type);

			return camera;
		}

		default:
			console.warn(`Babylon.js Editor Tools Lite: camera "${data.name}" of type "${data.type}" is not supported by Babylon Lite.`);
			return null;
	}
}

/**
 * Clones the given camera (free or arc rotate camera), the equivalent of Babylon.js `camera.clone()`: Babylon Lite
 * has no function to clone a camera. The clone has no parent and is not set as the active camera of the scene.
 * @param camera defines the reference to the camera to clone.
 * @param name defines the name of the clone.
 * @returns the clone of the camera or null if the type of the camera is not supported.
 */
export function cloneCamera(camera: Camera, name: string): Camera | null {
	let clone: Camera;

	if ("alpha" in camera && "beta" in camera && "radius" in camera) {
		const source = camera as ArcRotateCamera;
		const arcRotateCamera = createArcRotateCamera(source.alpha, source.beta, source.radius, { x: source.target.x, y: source.target.y, z: source.target.z });

		arcRotateCamera.inertia = source.inertia;
		arcRotateCamera.panningInertia = source.panningInertia;
		arcRotateCamera.angularSensibility = source.angularSensibility;
		arcRotateCamera.panningSensibility = source.panningSensibility;
		arcRotateCamera.wheelPrecision = source.wheelPrecision;

		const limits = {
			lowerAlphaLimit: source.lowerAlphaLimit,
			upperAlphaLimit: source.upperAlphaLimit,
			lowerBetaLimit: source.lowerBetaLimit,
			upperBetaLimit: source.upperBetaLimit,
			lowerRadiusLimit: source.lowerRadiusLimit,
			upperRadiusLimit: source.upperRadiusLimit,
		};

		if (Object.values(limits).some((value) => value !== undefined)) {
			setCameraLimits(arcRotateCamera, limits);
		}

		clone = arcRotateCamera;
	} else if ("position" in camera && "target" in camera && "speed" in camera) {
		const source = camera as FreeCamera;
		const freeCamera = createFreeCamera({ x: source.position.x, y: source.position.y, z: source.position.z }, { x: source.target.x, y: source.target.y, z: source.target.z });

		freeCamera.speed = source.speed;
		freeCamera.inertia = source.inertia;
		freeCamera.angularSensitivity = source.angularSensitivity;

		clone = freeCamera;
	} else {
		return null;
	}

	clone.name = name;
	clone.metadata = camera.metadata ? JSON.parse(JSON.stringify(camera.metadata)) : {};

	clone.fov = camera.fov;
	clone.nearPlane = camera.nearPlane;
	clone.farPlane = camera.farPlane;

	if (camera.ortho) {
		enableOrthographicCamera(clone, { ...camera.ortho });
	}

	if (camera.viewport) {
		clone.viewport = { ...camera.viewport };
	}

	return clone;
}

/**
 * Attaches the default inputs to the given camera, the equivalent of Babylon.js `camera.attachControl()`: arc rotate
 * cameras orbit around their target, free cameras move using the keyboard (WASD / arrows) and look around using the mouse.
 * @param camera defines the reference to the camera to attach the inputs to.
 * @param scene defines the reference to the scene the camera belongs to.
 * @param canvas defines the canvas listened for the inputs (the canvas of the scene by default).
 * @returns a function that detaches the inputs.
 */
export function attachCameraControl(camera: Camera, scene: SceneContext, canvas?: HTMLCanvasElement): () => void {
	const element = canvas ?? (scene.surface.canvas as HTMLCanvasElement);

	if (isArcRotateCamera(camera)) {
		return attachControl(camera as ArcRotateCamera, element, scene);
	}

	if (isFreeCamera(camera)) {
		return attachFreeControl(camera as FreeCamera, element, scene);
	}

	return () => {};
}
