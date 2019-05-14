import { TerrainMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class TerrainMaterialTool extends MaterialTool<TerrainMaterial> {
    // Public members
    public divId: string = 'TERRAIN-MATERIAL-TOOL';
    public tabName: string = 'Terrain Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof TerrainMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Tri planar
        const terrain = this.tool.addFolder('Terrain');
        terrain.open();

        this.tool.addTexture(terrain, this.editor, this.editor.core.scene, 'mixTexture', this.object, false).name('Mix Texture');

        // Diffuse
        const diffuse = terrain.addFolder('Diffuse');
        diffuse.open();

        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTexture1', this.object, false).name('Diffuse Texture R');
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTexture2', this.object, false).name('Diffuse Texture G');
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTexture3', this.object, false).name('Diffuse Texture B');

        // Bump
        const bump = terrain.addFolder('Bump');
        bump.open();

        this.tool.addTexture(bump, this.editor, this.editor.core.scene, 'bumpTexture1', this.object, false).name('Bump Texture R');
        this.tool.addTexture(bump, this.editor, this.editor.core.scene, 'bumpTexture2', this.object, false).name('Bump Texture G');
        this.tool.addTexture(bump, this.editor, this.editor.core.scene, 'bumpTexture3', this.object, false).name('Bump Texture B');

        // Specular
        const specular = terrain.addFolder('Specular');
        specular.open();

        this.tool.addColor(specular, 'Color', this.object.specularColor).open();
        specular.add(this.object, 'specularPower').min(0).step(0.5).name('Specular Power');
        
        // Options
        super.addOptions();
    }
}
