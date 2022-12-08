uniform sampler2D textureSampler;

varying vec2 vUV;

void main(void)
{
    gl_FragColor = texture2D(textureSampler, vUV);
}
