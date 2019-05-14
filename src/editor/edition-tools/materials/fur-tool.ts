import { FurMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class FurMaterialTool extends MaterialTool<FurMaterial> {
    // Public members
    public divId: string = 'FUR-MATERIAL-TOOL';
    public tabName: string = 'Fur Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof FurMaterial;
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

        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor, () => this.object.updateFur()).open();
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTexture', this.object, false, false, () => this.object.updateFur()).name('Texture');
        
        // Fur
        const fur = this.tool.addFolder('Fur');
        fur.open();

        this.tool.addColor(fur, 'Fur Color', this.object.furColor, () => this.object.updateFur()).open();
        fur.add(this.object, 'furLength').min(0).step(0.01).name('Fur Length').onChange(() => this.object.updateFur());
        fur.add(this.object, 'furAngle').min(0).step(0.1).name('Fur Angle').onChange(() => this.object.updateFur());

        // High level
        const highlevel = this.tool.addFolder('High Level Fur');
        highlevel.open();

        highlevel.add(this.object, 'highLevelFur').name('Compute High Level').onFinishChange(() => this.object.updateFur());
        highlevel.add(this.object, 'furDensity').min(0).step(0.1).name('Fur Density').onChange(() => this.object.updateFur());
        highlevel.add(this.object, 'furSpacing').min(0).step(0.01).name('Fur Spacing').onChange(() => this.object.updateFur());
        highlevel.add(this.object, 'furSpeed').min(1).max(1000).step(0.01).name('Fur Speed').onChange(() => this.object.updateFur());
        this.tool.addVector(highlevel, 'Gravity', this.object.furGravity, () => this.object.updateFur()).open();

        // Options
        super.addOptions();
    }
}
