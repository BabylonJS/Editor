import { FireMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class FireMaterialTool extends MaterialTool<FireMaterial> {
    // Public members
    public divId: string = 'FIRE-MATERIAL-TOOL';
    public tabName: string = 'Fire Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof FireMaterial;
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
        const fire = this.tool.addFolder('Fire');
        fire.open();

        fire.add(this.object, 'speed').min(0).step(0.01).name('Speed');
        this.tool.addTexture(fire, this.editor, 'distortionTexture', this.object, false).name('Distortion')
        this.tool.addTexture(fire, this.editor, 'opacityTexture', this.object, false).name('Opacity');
        
        // Options
        super.addOptions();
    }
}
