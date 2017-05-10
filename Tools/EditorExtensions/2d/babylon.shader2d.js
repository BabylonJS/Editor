var BABYLON;
(function (BABYLON) {
    BABYLON.Effect.ShadersStore["sprite2dPixelShader"] = [
        "precision highp float;",
        "uniform sampler2D textureSampler;",
        "uniform float alpha;",
        "uniform vec2 uvOffset;",
        "uniform vec2 uvScale;",
        "uniform float invertY;",
        "varying vec2 vUV;",
        "void main(void)",
        "{",
        "    vec4 color = texture2D(textureSampler, vec2(vUV.x, vUV.y * invertY) * uvScale + uvOffset);",
        "    if (color.a < 0.4)",
        "       discard;",
        "    color.a = alpha;",
        "    gl_FragColor = color;",
        "}"
    ].join("\n");
    BABYLON.Effect.ShadersStore["sprite2dVertexShader"] = [
        "precision highp float;",
        "attribute vec3 position;",
        "attribute vec2 uv;",
        "uniform mat4 world;",
        "varying vec2 vUV;",
        "void main(void)",
        "{",
        "    vUV = uv;",
        "    gl_Position = world * vec4(position, 1.0);",
        "}"
    ].join("\n");
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.shader2d.js.map