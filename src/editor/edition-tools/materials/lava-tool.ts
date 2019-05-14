import { LavaMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class LavaMaterialTool extends MaterialTool<LavaMaterial> {
    // Public members
    public divId: string = 'LAVA-MATERIAL-TOOL';
    public tabName: string = 'Lava Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof LavaMaterial;
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
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTexture', this.object, false).name('Texture');
        
        // Lava
        const lava = this.tool.addFolder('Lava');
        lava.open();

        this.tool.addTexture(lava, this.editor, this.editor.core.scene, 'noiseTexture', this.object, false).name('Noise');
        lava.add(this.object, 'movingSpeed').min(0).name('Moving Speed');
        lava.add(this.object, 'lowFrequencySpeed').min(0).name('Low Frequency Speed');

        // Fog
        const fog = this.tool.addFolder('Fog');
        fog.open();

        this.tool.addColor(fog, 'Fog Color', this.object.fogColor).open();
        fog.add(this.object, 'fogDensity').min(0).name('Fog Density');

        // Options
        super.addOptions();
    }
}
