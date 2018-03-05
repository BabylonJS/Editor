import { SkyMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class SkyMaterialTool extends MaterialTool<SkyMaterial> {
    // Public members
    public divId: string = 'SKY-MATERIAL-TOOL';
    public tabName: string = 'Sky Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof SkyMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Sky
        this.tool.add(this.object, 'inclination').step(0.01).name('Inclination');
        this.tool.add(this.object, 'azimuth').step(0.01).name('Azimuth');

        this.tool.add(this.object, 'luminance').step(0.01).name('Luminance');
        this.tool.add(this.object, 'turbidity').step(0.01).name('Turbidity');

        this.tool.add(this.object, 'mieCoefficient').step(0.0001).name('Mie Coefficient');
        this.tool.add(this.object, 'mieDirectionalG').step(0.01).name('Mie Coefficient G');
        
        this.tool.add(this.object, 'rayleigh').step(0.01).name('Reileigh Coefficient');

        // Options
        super.addOptions();
    }
}
