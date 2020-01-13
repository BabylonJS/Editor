import {
    GroundMesh
} from 'babylonjs';

import Editor from '../editor';
import { IPaintingTool } from "./painting-tools";
import AbstractEditionTool from '../edition-tools/edition-tool';

export default class TerrainPainter extends AbstractEditionTool<TerrainPainter> implements IPaintingTool {
    /**
     * Defines the id of the tool in the inspector.
     */
    public divId: string = 'TERRAIN-PAINTER-TOOL';
    /**
     * Defines the name of the tab in the inspector.
     */
    public tabName: string = 'Terrain Painter';
    /**
     * Gets wether or not the tool is enabled.
     */
    public enabled: boolean = false;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    constructor (public editor: Editor) {
        super();
    }

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof TerrainPainter;
    }

    /**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(_: TerrainPainter): void {
        super.update(_);
    }

    /**
     * Sets wether or not the tool is enabled.
     * @param enabled wether or not the tool is enabled.
     */
    public setEnabled (enabled: boolean): void {
        if (this.enabled === enabled)
            return;
        
        this.enabled = enabled;
    }
}
