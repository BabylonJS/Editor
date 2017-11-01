import { StandardMaterial }  from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class StandardMaterialTool extends MaterialTool<StandardMaterial> {
    // Public members
    public divId: string = 'STANDARD-MATERIAL-TOOL';
    public tabName: string = 'Standard Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && (object instanceof StandardMaterial || object.material instanceof StandardMaterial);
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
        diffuse.add(this.object, 'linkEmissiveWithDiffuse').name('Link Emissive With Diffuse');
        diffuse.add(this.object, 'useAlphaFromDiffuseTexture').name('Use Alpha From Diffuse Texture');
        this.tool.addTexture(diffuse, this.editor.core.scene, 'diffuseTexture', this.object).name('Diffuse Texture');
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();

        // Bump
        const bump = this.tool.addFolder('Bump');
        bump.open();
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        this.tool.addTexture(bump, this.editor.core.scene, 'bumpTexture', this.object).name('Bump Texture');

        // Specular
        const specular = this.tool.addFolder('Specular');
        specular.open();
        specular.add(this.object, 'specularPower').step(0.01).name('Specular Power');
        specular.add(this.object, 'useGlossinessFromSpecularMapAlpha').name('Use Glossiness From Specular Map Alpha');
        specular.add(this.object, 'useReflectionFresnelFromSpecular').name('Use Reflection Fresnel From Specular');
        specular.add(this.object, 'useSpecularOverAlpha').name('Use Specular Over Alpha');
        this.tool.addTexture(specular, this.editor.core.scene, 'specularTexture', this.object).name('Specular Texture');
        this.tool.addColor(specular, 'Color', this.object.specularColor).open();

        // Opacity
        const opacity = this.tool.addFolder('Opacity');
        opacity.open();
        this.tool.addTexture(opacity, this.editor.core.scene, 'opacityTexture', this.object).name('Opacity Texture');

        // Options
        super.addOptions();
    }
}
