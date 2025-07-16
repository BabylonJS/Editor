varying vec2 vUV;

uniform sampler2D textureSampler;

uniform float time;
uniform float alpha;

uniform vec2 resolution;

#define PI 3.14159265

float circle(vec2 uv, float blur)
{
    return smoothstep(0., blur, 1. - length(uv));
}

void main(void)
{
    if (alpha == 0.)
    {
        gl_FragColor = texture2D(textureSampler, vUV);
        return;
    }

    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    float circleWhite = circle(uv * 2.45, 1.);
    float circleBlack = circle(uv * 2.86, 0.7);
    float c = circleWhite - circleBlack;
    c *= 6.;

    float t = time * 5.;
    c -= circle(vec2(uv.x - sin(t) * .85, 1.8 * uv.y - cos(t) * .65) * .8, 3.);

    vec3 col = vec3(c) * vec3(0.576, 0.474, 0.901);
    col += vec3(smoothstep(0.2, 1.7, c)) * vec3(1., 1., 0.);
    col += vec3(smoothstep(0.4, 0.55, c));
    col *= 0.75;

    vec4 color = vec4(col, 1.);

    gl_FragColor = mix(texture2D(textureSampler, vUV), texture2D(textureSampler, vUV) + color, alpha);
}
