// Constructor
function CustomPostProcess () {
    this.time = 0;
    this.multiplier = 1;
}

// Called on building material
CustomPostProcess.prototype.init = function () {

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

return CustomPostProcess;
