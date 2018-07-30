import { PerlinNoiseProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class PerlinNoiseProceduralTool extends AbstractEditionTool<PerlinNoiseProceduralTexture> {
    // Public members
    public divId: string = 'PERLIN-NOISE-PROCEDURAL-TOOL';
    public tabName: string = 'Perlin Noise';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof PerlinNoiseProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: PerlinNoiseProceduralTexture): void {
        // Super
        super.update(object);

        // Perlin Noise
        const perlinNoise = this.tool.addFolder('Brick');
        perlinNoise.open();

        perlinNoise.add(object, 'timeScale').step(0.01).name('Time Scale');
        perlinNoise.add(object, 'translationSpeed').step(0.01).name('Translation Speed');
    }
}
