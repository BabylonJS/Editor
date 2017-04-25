module BABYLON {
    Effect.ShadersStore["sprite2dPixelShader"] = [
        "precision highp float;",

        "uniform sampler2D textureSampler;",
        "uniform float alpha;",

        "varying vec2 vUV;",

        "void main(void)",
        "{",
        "    vec4 color = texture2D(textureSampler, vUV);",
        "    if (color.a < 0.4)",
        "       discard;",

        "    color.a = alpha;",
        "    gl_FragColor = color;",
        "}"
    ].join("\n");

    Effect.ShadersStore["sprite2dVertexShader"] = [
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
}