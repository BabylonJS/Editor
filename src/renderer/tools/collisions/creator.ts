import { Scene, Mesh, BoundingInfo, Quaternion } from "babylonjs";

export class ColliderCreator {
	/**
	 * Creates a new cube collider and returns its reference.
	 * @param scene defines the reference to the scene where to add the collider.
	 * @param boundingInfo defines the reference to the bounding info of the source mesh.
	 * @returns the reference to the cube collider.
	 */
	public static CreateCube(scene: Scene, boundingInfo: BoundingInfo): Mesh {
		const colliderMesh = Mesh.CreateBox("boxCollider", 1, scene, false);
		colliderMesh.position.copyFrom(boundingInfo.boundingBox.center);
		colliderMesh.scaling.copyFrom(boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum));

		return colliderMesh;
	}

	/**
	 * Creates a new sphere collider and returns its reference.
	 * @param scene defines the reference to the scene where to add the collider.
	 * @param boundingInfo defines the reference to the bounding info of the source mesh.
	 * @returns the reference to the sphere collider.
	 */
	public static CreateSphere(scene: Scene, boundingInfo: BoundingInfo): Mesh {
		const colliderMesh = Mesh.CreateSphere("sphereCollider", 32, 1, scene, false);
		colliderMesh.position.copyFrom(boundingInfo.boundingSphere.center);
		colliderMesh.scaling.copyFrom(boundingInfo.boundingSphere.maximum.subtract(boundingInfo.boundingSphere.minimum));

		return colliderMesh;
	}

	/**
	 * Creates a new capsule collider and returns its reference.
	 * @param scene defines the reference to the scene where to add the collider.
	 * @param boundingInfo defines the reference to the bounding info of the source mesh.
	 * @returns the reference to the capsule collider.
	 */
	public static CreateCapsule(scene: Scene, boundingInfo: BoundingInfo): Mesh {
		const colliderMesh = Mesh.CreateCapsule("capsuleCollider", {
			height: 1,
			radius: 1,
			subdivisions: 32,
			tessellation: 32,
			capSubdivisions: 12,
			topCapSubdivisions: 12,
		}, scene);
		colliderMesh.position.copyFrom(boundingInfo.boundingBox.center);
		colliderMesh.scaling.copyFrom(boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum));

		return colliderMesh;
	}

	/**
	 * Creates a new LOD collider and returns its reference.
	 * @param sourceMesh defines the reference to the source mesh to take as LOD base geometry.
	 * @returns the reference to the LOD collider.
	 */
	public static CreateLod(sourceMesh: Mesh): Mesh {
		const colliderMesh = sourceMesh.clone("lodCollider", sourceMesh, true, false);

		colliderMesh.metadata = {};
		colliderMesh.scaling.set(1, 1, 1);
		colliderMesh.position.set(1, 1, 1);

		if (colliderMesh.rotationQuaternion) {
			colliderMesh.rotationQuaternion.copyFrom(Quaternion.Identity());
		}

		colliderMesh.rotation.set(0, 0, 0);

		return colliderMesh;
	}
}
