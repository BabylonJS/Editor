import { GrassProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class GrassProceduralTool extends AbstractEditionTool<GrassProceduralTexture> {
    // Public members
    public divId: string = 'GRASS-PROCEDURAL-TOOL';
    public tabName: string = 'Grass';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof GrassProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: GrassProceduralTexture): void {
        // Super
        super.update(object);

        // Grass
        const grass = this.tool.addFolder('Grass');
        grass.open();

        object.grassColors.forEach((c, index) => {
            this.tool.addColor(grass, 'Grass Color ' + index, c, () => object.updateShaderUniforms()).open();
        })
        this.tool.addColor(grass, 'Ground Color', object.groundColor, () => object.updateShaderUniforms()).open();
    }
}
