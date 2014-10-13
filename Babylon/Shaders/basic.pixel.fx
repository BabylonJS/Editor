// Default pixel shader
precision mediump float;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D otherSampler;

void main(void) {
	gl_FragColor = texture2D(textureSampler, vUV)
		+ texture2D(otherSampler, vUV);
}
