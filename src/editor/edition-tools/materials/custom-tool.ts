import CustomEditorMaterial from '../../../extensions/material-creator/material';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class CustomMaterialTool extends MaterialTool<CustomEditorMaterial> {
    // Public members
    public divId: string = 'CUSTOM-MATERIAL-TOOL';
    public tabName: string = 'Custom Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && object.getClassName && (object.getClassName() === 'CustomMaterial' || (object.material && object.material.getClassName() === 'CustomMaterial'));
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);
        this.setTabName('Custom Material');

        // Diffuse
        const diffuse = this.tool.addFolder('Diffuse');
        diffuse.open();

        this.tool.addColor(diffuse, 'diffuseColor', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture', this.object, false).name('Diffuse Texture');

        // All other textures
        if (this.object.config) {
            this.object.config.textures.forEach(t => {
                const texture = this.tool.addFolder('Custom Texture: ' + t.name);
                texture.open();

                this.tool.addTexture(texture, this.editor, t.name, this.object, t.isCube).name(t.name);
            });
        }

        // Options
        super.addOptions();
    }
}
