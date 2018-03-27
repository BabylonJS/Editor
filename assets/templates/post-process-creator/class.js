// Constructor
function PostProcess () {
    this.time = 0;
    this.multiplier = 1;
}

// Called on building material
PostProcess.prototype.init = function () {
    
};

PostProcess.prototype.setUniforms = function (uniforms, samplers) {
    // Push custom uniforms
    uniforms.push('time');
};

PostProcess.prototype.onApply = function (effect) {
    this.time += camera.getScene().getEngine().getDeltaTime() * 0.01;

    effect.setFloat('time', this.multiplier * Math.cos(this.time));
};

// On dispose the material
PostProcess.prototype.dispose = function () {

};

return PostProcess;
