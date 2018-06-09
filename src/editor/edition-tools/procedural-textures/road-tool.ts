import { RoadProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class RoadProceduralTool extends AbstractEditionTool<RoadProceduralTexture> {
    // Public members
    public divId: string = 'ROAD-PROCEDURAL-TOOL';
    public tabName: string = 'Road';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof RoadProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: RoadProceduralTexture): void {
        // Super
        super.update(object);

        // Road
        const road = this.tool.addFolder('Road');
        road.open();

        this.tool.addColor(road, 'Road Color', object.roadColor, () => object.updateShaderUniforms()).open();
    }
}
