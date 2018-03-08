import { GridMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class CellMaterialTool extends MaterialTool<GridMaterial> {
    // Public members
    public divId: string = 'GRID-MATERIAL-TOOL';
    public tabName: string = 'Grid Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof GridMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Grid
        const grid = this.tool.addFolder('Fire');
        grid.open();

        this.tool.addColor(grid, 'Main Color', this.object.mainColor).open();
        this.tool.addColor(grid, 'Line Color', this.object.lineColor).open();

        grid.add(this.object, 'gridRatio').step(0.1).name('Grid Ratio');
        grid.add(this.object, 'opacity').min(0).step(0.01).name('Opacity');
        grid.add(this.object, 'majorUnitFrequency').name('Major Unit Frequency');
        grid.add(this.object, 'minorUnitVisibility').name('Minor Unit Visibility');
        
        // Options
        super.addOptions();
    }
}
