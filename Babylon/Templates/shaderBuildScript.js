// Set uniforms and attributes here and then return :
(function () {
    var uniforms = new Array(); // Automatically set : mat4 worldViewProjection;
    var attributes = new Array(); // Automatically set : vec4 position, uv

    uniforms.push('time');

    return {
        uniforms: uniforms,
        attributes: attributes
    }
})();
