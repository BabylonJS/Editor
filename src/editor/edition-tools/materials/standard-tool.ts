import { StandardMaterial }  from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class StandardMaterialTool extends MaterialTool<StandardMaterial> {
    // Public members
    public divId: string = 'STANDARD-MATERIAL-TOOL';
    public tabName: string = 'Standard Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && object.material instanceof StandardMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(material: StandardMaterial): void {
        super.update(material);
        
        // TODO
    }
}
