// Called on building material
CustomMaterial.constructor = function () {
    this.time = 0;
};

CustomMaterial.setUniforms = function (uniforms, samplers) {
    uniforms.push('time');
};

// Returns if the material is ready for the given submesh
CustomMaterial.isReadyForSubMesh = function (mesh, subMesh, defines) {
    return true;
};

// Bind uniforms for submesh
CustomMaterial.bindForSubMesh = function (world, mesh, subMesh, effect) {
    var scene = mesh.getScene();

    this.time += scene.getEngine().getDeltaTime() * 0.01;
    effect.setFloat('time', this.time);
};

// On dispose the material
CustomMaterial.dispose = function () {

};
