import { Camera, Vector3 } from "babylonjs";

export interface ICameraFocusPositionOptions {
	minimum: Vector3;
	maximum: Vector3;

	distance?: number;
}

export function getCameraFocusPositionFor(target: Vector3, camera: Camera, options: ICameraFocusPositionOptions) {
	const fov = camera.fov;
	const aspect = camera.getEngine().getAspectRatio(camera);
	const sizeVec = options.maximum.subtract(options.minimum);

	const verticalSize = sizeVec.y;
	const horizontalSize = sizeVec.x;

	const verticalDistance = verticalSize / 2 / Math.tan(fov / 2);
	const horizontalDistance = horizontalSize / 2 / Math.tan((fov * aspect) / 2);
	const idealDistance = Math.max(verticalDistance, horizontalDistance) * (options.distance ?? 2);

	const cameraPosition = camera.globalPosition.clone();
	cameraPosition.y = Math.abs(cameraPosition.y);

	const directionToMesh = cameraPosition.subtract(target).normalize();

	const position = target.add(directionToMesh.scale(idealDistance));
	position.y += sizeVec.y * 0.25;

	return position;
}
