// Called on building material
this.constructor = function () {

};

// Returns if the material is ready for the given submesh
this.isReadyForSubMesh = function (mesh, subMesh, defines) {
    return true;
}

// Bind uniforms for submesh
this.bindForSubMesh = function (world, mesh, subMesh, effect) {

};

// On dispose the material
this.dispose = function () {

}
