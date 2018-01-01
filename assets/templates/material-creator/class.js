// Called on building material
this.constructor = function () {

};

// Returns if the material is ready for the given submesh
this.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
    return true;
}

// Bind uniforms for submesh
this.bindForSubMesh = function (world, mesh, subMesh) {

};

// On dispose the material
this.dispose = function () {

}

// On serialize the material
this.serialize = function (serializationObject) {

};

// On parse the material
this.parse = function (source) {

};
