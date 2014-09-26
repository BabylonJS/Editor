// Set uniforms and attributes here and then return :
(function () {
    var uniforms = new Array(); // Automatically set : mat4 worldViewProjection;
    var attributes = new Array(); // Automatically set : vec4 position, vec2 uv
    var samplers = new Array();
    var spies = new Array(); // Values you want to spy

    attributes.push('normal');

    samplers.push('textureSampler');

    uniforms.push('time');

    spies.push('time');

    return {
        uniforms: uniforms,
        attributes: attributes,
        samplers: samplers,
        spies: spies
    }
})();
