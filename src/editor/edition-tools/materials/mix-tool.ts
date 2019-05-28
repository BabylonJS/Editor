import { MixMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';

export default class MixMaterialTool extends MaterialTool<MixMaterial> {
    // Public members
    public divId: string = 'MIX-MATERIAL-TOOL';
    public tabName: string = 'Mix Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof MixMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Mix map 1
        const mixmap1 = this.tool.addFolder('Mix Map 1');
        mixmap1.open();

        this.tool.addTexture(mixmap1, this.editor, this.editor.core.scene, 'mixTexture1', this.object, false).name('Mix Texture 1');
        this.tool.addTexture(mixmap1, this.editor, this.editor.core.scene, 'diffuseTexture1', this.object, false).name('Diffuse Texture 1');
        this.tool.addTexture(mixmap1, this.editor, this.editor.core.scene, 'diffuseTexture2', this.object, false).name('Diffuse Texture 2');
        this.tool.addTexture(mixmap1, this.editor, this.editor.core.scene, 'diffuseTexture3', this.object, false).name('Diffuse Texture 3');
        this.tool.addTexture(mixmap1, this.editor, this.editor.core.scene, 'diffuseTexture4', this.object, false).name('Diffuse Texture 4');

        // Mix map 2
        const mixmap2 = this.tool.addFolder('Mix Map 2');
        mixmap2.open();

        this.tool.addTexture(mixmap2, this.editor, this.editor.core.scene, 'mixTexture2', this.object, false).name('Mix Texture 2');
        this.tool.addTexture(mixmap2, this.editor, this.editor.core.scene, 'diffuseTexture5', this.object, false).name('Diffuse Texture 5');
        this.tool.addTexture(mixmap2, this.editor, this.editor.core.scene, 'diffuseTexture6', this.object, false).name('Diffuse Texture 6');
        this.tool.addTexture(mixmap2, this.editor, this.editor.core.scene, 'diffuseTexture7', this.object, false).name('Diffuse Texture 7');
        this.tool.addTexture(mixmap2, this.editor, this.editor.core.scene, 'diffuseTexture8', this.object, false).name('Diffuse Texture 8');

        // Options
        super.addOptions();
    }
}
