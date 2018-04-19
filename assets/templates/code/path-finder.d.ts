interface PathFinder {
    fromTo (from: BABYLON.Vector3, to: BABYLON.Vector3): BABYLON.Vector3[];
    findNearestPoint (point: BABYLON.Vector3): BABYLON.Vector3;
    fill (castMeshes: BABYLON.AbstractMesh[], rayHeight?: number, rayLength?: number): void;
}