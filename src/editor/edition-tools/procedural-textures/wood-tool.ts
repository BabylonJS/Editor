import { WoodProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class WoodProceduralTool extends AbstractEditionTool<WoodProceduralTexture> {
    // Public members
    public divId: string = 'WOOD-PROCEDURAL-TOOL';
    public tabName: string = 'Wood';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof WoodProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: WoodProceduralTexture): void {
        // Super
        super.update(object);

        // Wood
        const wood = this.tool.addFolder('Wood');
        wood.open();

        wood.add(object, 'ampScale').step(0.01).name('Amp Scale');
        this.tool.addColor(wood, 'Wood Color', object.woodColor, () => object.updateShaderUniforms()).open();
    }
}
