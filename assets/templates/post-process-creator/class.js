// Called on building material
CustomPostProcess.constructor = function () {
    // Add a custom property
    this.time = 0;
};

CustomPostProcess.setUniforms = function (uniforms, samplers) {
    // Push custom uniforms
    uniforms.push('time');
};

CustomPostProcess.onApply = function (effect) {
    effect.setFloat('time', this.time);
};

// On dispose the material
CustomPostProcess.dispose = function () {

};
