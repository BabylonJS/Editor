import { PBRMaterial }  from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class PBRTool extends MaterialTool<PBRMaterial> {
    // Public members
    public divId: string = 'PBR-TOOL';
    public tabName: string = 'PBR Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && (object instanceof PBRMaterial || object.material instanceof PBRMaterial);
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);
        
        // Diffuse
        const albedo = this.tool.addFolder('Albedo');
        albedo.open();
        this.tool.addTexture(albedo, this.editor.core.scene, 'albedoTexture', this.object).name('Albedo Texture');
        this.tool.addColor(albedo, 'Color', this.object.albedoColor).open();

        // Options
        super.addOptions();
    }
}
