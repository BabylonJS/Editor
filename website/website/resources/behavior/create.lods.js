// Called once starting the scripts
this.start = function () {
    for (var i = 0; i < scene.meshes.length; i++) {
        var m = scene.meshes[i];

        m.simplify([
            { distance: 100, quality: 0.5, optimizeMesh: true }
        ], true, BABYLON.SimplificationType.QUADRATIC, function () {
            BABYLON.Tools.Log("LOD finished");
        });
    }
}
