// Constructor
function Material () {
    this.time = 0;
}

// Called on building material
Material.prototype.init = function () {

};

Material.prototype.setUniforms = function (uniforms, samplers) {
    // Push custom uniforms
    uniforms.push('time');
};

// Returns if the material is ready for the given submesh
Material.prototype.isReadyForSubMesh = function (mesh, subMesh, defines) {
    return true;
};

// Bind uniforms for submesh
Material.prototype.bindForSubMesh = function (world, mesh, subMesh, effect) {
    var scene = mesh.getScene();

    // Time
    this.time += scene.getEngine().getDeltaTime() * 0.01;
    effect.setFloat('time', this.time);
};

// On dispose the material
Material.prototype.dispose = function () {

};

return Material;
