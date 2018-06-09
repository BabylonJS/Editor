import { CloudProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class CloudProceduralTool extends AbstractEditionTool<CloudProceduralTexture> {
    // Public members
    public divId: string = 'CLOUD-PROCEDURAL-TOOL';
    public tabName: string = 'Cloud';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof CloudProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: CloudProceduralTexture): void {
        // Super
        super.update(object);

        // Cloud
        const cloud = this.tool.addFolder('Cloud');
        cloud.open();

        this.tool.addColor(cloud, 'Sky Color', object.skyColor, () => object.updateShaderUniforms()).open();
        this.tool.addColor(cloud, 'Cloud Color', object.cloudColor, () => object.updateShaderUniforms()).open();
    }
}
