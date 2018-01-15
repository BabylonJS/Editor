// Called on building material
CustomPostProcess.prototype.init = function () {
    // Add a custom property
    this.time = 0;
};

CustomPostProcess.prototype.setUniforms = function (uniforms, samplers) {
    // Push custom uniforms
    uniforms.push('time');
};

CustomPostProcess.prototype.onApply = function (effect) {
    this.time += camera.getScene().getEngine().getDeltaTime();
    effect.setFloat('time', this.time);
};

// On dispose the material
CustomPostProcess.prototype.dispose = function () {

};
