// Uniforms
uniform float multiplier;
uniform float time;

// Samplers
varying vec2 vUV;
uniform sampler2D textureSampler;

void main(void) 
{
	gl_FragColor = texture2D(textureSampler, vUV) * multiplier * cos(time);
}
