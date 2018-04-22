interface PathFinder {
    points: BABYLON.Vector3[];
    availablePoints: BABYLON.Vector3[];

    fromTo (from: BABYLON.Vector3, to: BABYLON.Vector3, optimize?: boolean): BABYLON.Vector3[];
    findNearestPoint (point: BABYLON.Vector3): BABYLON.Vector3;
    fill (castMeshes: BABYLON.AbstractMesh[], rayHeight?: number, rayLength?: number): void;
    createAnimation (name: string, path: BABYLON.Vector3[], framesPerSecond?: number): BABYLON.Animation
}