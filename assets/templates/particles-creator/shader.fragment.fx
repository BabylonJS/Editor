// Varying
varying vec2 vUV;
varying vec4 vColor;
#ifdef CLIPPLANE
varying float fClipDistance;
#endif

// Uniforms
uniform sampler2D diffuseSampler;
uniform vec4 textureMask;

// Main
void main(void)
{
    #ifdef CLIPPLANE
    if (fClipDistance > 0.0)
        discard;
    #endif

    vec4 baseColor = texture2D(diffuseSampler, vUV);
    gl_FragColor = (baseColor * textureMask + (vec4(1., 1., 1., 1.) - textureMask)) * vColor;
}