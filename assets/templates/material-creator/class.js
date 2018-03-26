// Constructor
function CustomMaterial () {
    this.time = 0;
}

// Called on building material
CustomMaterial.prototype.init = function () {

};

CustomMaterial.prototype.setUniforms = function (uniforms, samplers) {
    // Push custom uniforms
    uniforms.push('time');
};

// Returns if the material is ready for the given submesh
CustomMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, defines) {
    return true;
};

// Bind uniforms for submesh
CustomMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh, effect) {
    var scene = mesh.getScene();

    // Time
    this.time += scene.getEngine().getDeltaTime() * 0.01;
    effect.setFloat('time', this.time);
};

// On dispose the material
CustomMaterial.prototype.dispose = function () {

};

return CustomMaterial;
