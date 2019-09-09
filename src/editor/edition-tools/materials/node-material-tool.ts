import { NodeMaterial } from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class NodeMaterialTool extends MaterialTool<NodeMaterial> {
    // Public members
    public divId: string = 'NODE-MATERIAL-TOOL';
    public tabName: string = 'Node Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof NodeMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Edit...
        this.tool.add(this, '_edit').name('Edit...');

        // Options
        super.addOptions();
    }

    // Edits the node material
    private async _edit (): Promise<void> {
        await Tools.ImportScript<any>('babylonjs-node-editor');
        this.object.edit();
    }
}
