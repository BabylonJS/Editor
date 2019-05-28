import { TriPlanarMaterial } from 'babylonjs-materials';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class TriPlanarMaterialTool extends MaterialTool<TriPlanarMaterial> {
    // Public members
    public divId: string = 'TRI-PLANAR-MATERIAL-TOOL';
    public tabName: string = 'Tri Planar Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof TriPlanarMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Tri planar
        const triplanar = this.tool.addFolder('Tri Planar');
        triplanar.open();

        triplanar.add(this.object, 'tileSize').min(0).step(0.01).name('Tile Size');

        // Diffuse
        const diffuse = triplanar.addFolder('Diffuse');
        diffuse.open();

        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTextureX', this.object, false).name('Diffuse Texture X');
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTextureY', this.object, false).name('Diffuse Texture Y');
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTextureZ', this.object, false).name('Diffuse Texture Z');

        // Bump
        const bump = triplanar.addFolder('Bump');
        bump.open();

        this.tool.addTexture(triplanar, this.editor, this.editor.core.scene, 'normalTextureX', this.object, false).name('Normal Texture X');
        this.tool.addTexture(triplanar, this.editor, this.editor.core.scene, 'normalTextureY', this.object, false).name('Normal Texture Y');
        this.tool.addTexture(triplanar, this.editor, this.editor.core.scene, 'normalTextureZ', this.object, false).name('Normal Texture Z');

        // Specular
        const specular = triplanar.addFolder('Specular');
        specular.open();

        this.tool.addColor(specular, 'Color', this.object.specularColor).open();
        specular.add(this.object, 'specularPower').min(0).step(0.5).name('Specular Power');
        
        // Options
        super.addOptions();
    }
}
