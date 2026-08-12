import { Vector3, Ray } from "babylonjs";

/**
 * Returns whether or not the triangle defined by the three points is facing the given ray direction.
 * @param p0 defines the first point of the triangle
 * @param p1 defines the second point of the triangle
 * @param p2 defines the third point of the triangle
 * @param ray defines the reference to the ray to test against
 */
export function isTriangleFacingCamera(p0: Vector3, p1: Vector3, p2: Vector3, ray: Ray) {
	// Calculate the face normal in local space
	const p0p1 = p0.subtract(p1);
	const p2p1 = p2.subtract(p1);
	const normal = Vector3.Cross(p0p1, p2p1);

	// Return true only if the triangle faces the ray direction
	return Vector3.Dot(ray.direction, normal) < 0;
}
