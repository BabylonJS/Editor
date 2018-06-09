import { FireProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class FireProceduralTool extends AbstractEditionTool<FireProceduralTexture> {
    // Public members
    public divId: string = 'FIRE-PROCEDURAL-TOOL';
    public tabName: string = 'Fire';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof FireProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: FireProceduralTexture): void {
        // Super
        super.update(object);

        // Fire
        const fire = this.tool.addFolder('Fire');
        fire.open();

        fire.add(object, 'autoGenerateTime').name('Auto Generate Time');
        fire.add(object, 'alphaThreshold').min(0).max(1).name('Alpha Threshold');
        this.tool.addVector(fire, 'Speed', object.speed, () => object.updateShaderUniforms()).open();

        object.fireColors.forEach((c, index) => {
            this.tool.addColor(fire, 'Color ' + index, c, () => object.updateShaderUniforms()).open();
        });
    }
}
