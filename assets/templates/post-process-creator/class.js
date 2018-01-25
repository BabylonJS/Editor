// Called on building material
CustomPostProcess.prototype.init = function () {
    // Add a custom property
    this.time = 0;
    this.multiplier = 1;
};

CustomPostProcess.prototype.setUniforms = function (uniforms, samplers) {
    // Push custom uniforms
    uniforms.push('time');
};

CustomPostProcess.prototype.onApply = function (effect) {
    this.time += camera.getScene().getEngine().getDeltaTime() * 0.01;

    effect.setFloat('time', this.multiplier * Math.cos(this.time));
};

// On dispose the material
CustomPostProcess.prototype.dispose = function () {

};
