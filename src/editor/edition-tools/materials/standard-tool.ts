import { StandardMaterial } from 'babylonjs';

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
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture', this.object).name('Diffuse Texture');
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();

        // Bump
        const bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        bump.add(this.object, 'useParallax').name('Use Parallax');
        bump.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion');
        bump.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');

        // Specular
        const specular = this.tool.addFolder('Specular');
        specular.open();
        specular.add(this.object, 'specularPower').step(0.01).name('Specular Power');
        specular.add(this.object, 'useGlossinessFromSpecularMapAlpha').name('Use Glossiness From Specular Map Alpha');
        specular.add(this.object, 'useReflectionFresnelFromSpecular').name('Use Reflection Fresnel From Specular');
        specular.add(this.object, 'useSpecularOverAlpha').name('Use Specular Over Alpha');
        this.tool.addTexture(specular, this.editor, 'specularTexture', this.object).name('Specular Texture');
        this.tool.addColor(specular, 'Color', this.object.specularColor).open();

        // Opacity
        const opacity = this.tool.addFolder('Opacity');
        opacity.open();
        this.tool.addTexture(opacity, this.editor, 'opacityTexture', this.object).name('Opacity Texture');

        // Emissive
        const emissive = this.tool.addFolder('Emissive');
        emissive.open();
        this.tool.addColor(emissive, 'Emissive', this.object.emissiveColor).open();
        emissive.add(this.object, 'useEmissiveAsIllumination').name('Use Emissive As Illumination');
        this.tool.addTexture(emissive, this.editor, 'emissiveTexture', this.object).name('Emissive Texture');

        // Ambient
        const ambient = this.tool.addFolder('Ambient');
        ambient.open();
        this.tool.addColor(ambient, 'Ambient', this.object.ambientColor).open();
        this.tool.addTexture(ambient, this.editor, 'ambientTexture', this.object).name('Ambient Texture');

        // Light map
        const lightmap = this.tool.addFolder('Lightmap');
        lightmap.open();
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, 'lightmapTexture', this.object).name('Lightmap Texture');

        // Reflection
        const reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor, 'reflectionTexture', this.object, true).name('Reflection Texture');

        // Refraction
        const refraction = this.tool.addFolder('Refraction');
        refraction.open();
        refraction.add(this.object, 'indexOfRefraction').name('Index of Refraction');
        refraction.add(this.object, 'invertRefractionY').name('Invert Y');
        this.tool.addTexture(refraction, this.editor, 'refractionTexture', this.object, true).name('Refraction Texture');

        // Options
        super.addOptions();
    }
}
