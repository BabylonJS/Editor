import { NormalMapProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class NormalProceduralTool extends AbstractEditionTool<NormalMapProceduralTexture> {
    // Public members
    public divId: string = 'NORMAL-PROCEDURAL-TOOL';
    public tabName: string = 'Normal';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof NormalMapProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: NormalMapProceduralTexture): void {
        // Super
        super.update(object);

        // Normal
        const normal = this.tool.addFolder('Normal');
        normal.open();

        this.tool.addTexture(normal, this.editor, 'baseTexture', object, false, false, () => object.updateShaderUniforms());
    }
}
