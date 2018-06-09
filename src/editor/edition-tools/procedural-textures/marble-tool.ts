import { MarbleProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class MarbleProceduralTool extends AbstractEditionTool<MarbleProceduralTexture> {
    // Public members
    public divId: string = 'MARBLE-PROCEDURAL-TOOL';
    public tabName: string = 'Marble';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof MarbleProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: MarbleProceduralTexture): void {
        // Super
        super.update(object);

        // Marble
        const marble = this.tool.addFolder('Brick');
        marble.open();

        marble.add(object, 'numberOfTilesHeight').step(0.01).name('Tiles Height');
        marble.add(object, 'numberOfTilesWidth').step(0.01).name('Tiles Width');
        marble.add(object, 'amplitude').step(0.01).name('Amplitude');

        this.tool.addColor(marble, 'Joint Color', object.jointColor, () => object.updateShaderUniforms()).open();
    }
}
