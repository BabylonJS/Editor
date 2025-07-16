import { RawTexture, Constants, Scene } from "babylonjs";

/**
 * Creates a raw texture composed of random values for RGBA in order to be used by GPU particle systems.
 * This is useful in case the random textures of a GPU particle system must be changed dynamically.
 * @param textureSize defines the size of the texture (size x size).
 * @param scene defines the reference to the scene where to add the texture.
 */
export function createGpuParticleSystemRandomTexture(textureSize: number, scene: Scene): RawTexture {
	const d: number[] = [];
	for (let i = 0; i < textureSize; ++i) {
		d.push(Math.random());
		d.push(Math.random());
		d.push(Math.random());
		d.push(Math.random());
	}

	const texture = new RawTexture(
		new Float32Array(d),
		textureSize,
		1,
		Constants.TEXTUREFORMAT_RGBA,
		scene,
		false,
		false,
		Constants.TEXTURE_NEAREST_SAMPLINGMODE,
		Constants.TEXTURETYPE_FLOAT
	);

	texture.name = "gpu-particle-system-random-texture";
	texture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
	texture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;

	return texture;
}
