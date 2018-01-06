// Called once starting the scripts
this.start = function () {
    mesh.simplify([
        { distance: 100, quality: 0.5, optimizeMesh: true },
        { distance: 200, quality: 0.25, optimizeMesh: false }
    ], true, BABYLON.SimplificationType.QUADRATIC, function () {
        BABYLON.Tools.Log("LOD finished for mesh " + mesh.name);
    });
}
