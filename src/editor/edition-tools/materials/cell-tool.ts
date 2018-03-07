import { CellMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class CellMaterialTool extends MaterialTool<CellMaterial> {
    // Public members
    public divId: string = 'CELL-MATERIAL-TOOL';
    public tabName: string = 'Cell Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof CellMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Diffuse
        const diffuse = this.tool.addFolder('Diffuse');
        diffuse.open();

        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture', this.object, false).name('Texture');
        
        // Fire
        const cell = this.tool.addFolder('Fire');
        cell.open();

        cell.add(this.object, 'computeHighLevel').name('Compute High Level');
        
        // Options
        super.addOptions();
    }
}
