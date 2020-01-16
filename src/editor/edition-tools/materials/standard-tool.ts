import { StandardMaterial, PBRMaterial, MultiMaterial, Tags, Texture } from 'babylonjs';

import MaterialTool from './material-tool';

import Window from '../../gui/window';
import GraphicsTools from '../../tools/graphics-tools';
import TexturePicker from '../../components/texture-picker';

export default class StandardMaterialTool extends MaterialTool<StandardMaterial> {
    // Public members
    public divId: string = 'STANDARD-MATERIAL-TOOL';
    public tabName: string = 'Standard Material';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof StandardMaterial;
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
        this.tool.addTexture(diffuse, this.editor, this.editor.core.scene, 'diffuseTexture', this.object).name('Diffuse Texture');
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();

        // Bump
        const bump = this.tool.addFolder('Bump');
        this.tool.addTexture(bump, this.editor, this.editor.core.scene, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');

        const parallax = bump.addFolder('Parallax Mapping');
        parallax.open();

        parallax.add(this.object, 'useParallax').name('Use Parallax').onChange((r) => {
            this.object.useParallax = r;
            this.object.useParallaxOcclusion = this.object.useParallaxOcclusion;
        });
        parallax.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion').onChange((r) => {
            this.object.useParallax = this.object.useParallax;
            this.object.useParallaxOcclusion = r;
        });
        parallax.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');
        parallax.add(this, '_mergeBumpWithDisplacement').name('Create Map From Displacement');

        // Specular
        const specular = this.tool.addFolder('Specular');
        specular.open();
        specular.add(this.object, 'specularPower').step(0.01).name('Specular Power');
        specular.add(this.object, 'useGlossinessFromSpecularMapAlpha').name('Use Glossiness From Specular Map Alpha');
        specular.add(this.object, 'useReflectionFresnelFromSpecular').name('Use Reflection Fresnel From Specular');
        specular.add(this.object, 'useSpecularOverAlpha').name('Use Specular Over Alpha');
        this.tool.addTexture(specular, this.editor, this.editor.core.scene, 'specularTexture', this.object).name('Specular Texture');
        this.tool.addColor(specular, 'Color', this.object.specularColor).open();

        // Opacity
        const opacity = this.tool.addFolder('Opacity');
        this.tool.addTexture(opacity, this.editor, this.editor.core.scene, 'opacityTexture', this.object).name('Opacity Texture');

        // Emissive
        const emissive = this.tool.addFolder('Emissive');
        this.tool.addColor(emissive, 'Emissive', this.object.emissiveColor).open();
        emissive.add(this.object, 'useEmissiveAsIllumination').name('Use Emissive As Illumination');
        this.tool.addTexture(emissive, this.editor, this.editor.core.scene, 'emissiveTexture', this.object).name('Emissive Texture');

        // Ambient
        const ambient = this.tool.addFolder('Ambient');
        this.tool.addColor(ambient, 'Ambient', this.object.ambientColor).open();
        this.tool.addTexture(ambient, this.editor, this.editor.core.scene, 'ambientTexture', this.object).name('Ambient Texture');

        // Light map
        const lightmap = this.tool.addFolder('Lightmap');
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, this.editor.core.scene, 'lightmapTexture', this.object).name('Lightmap Texture');

        // Reflection
        const reflection = this.tool.addFolder('Reflection');
        reflection.add(this.object, 'roughness').min(0).step(0.01).name('Roughness');
        this.tool.addTexture(reflection, this.editor, this.editor.core.scene, 'reflectionTexture', this.object, true).name('Reflection Texture');

        // Refraction
        const refraction = this.tool.addFolder('Refraction');
        refraction.add(this.object, 'indexOfRefraction').name('Index of Refraction');
        refraction.add(this.object, 'invertRefractionY').name('Invert Y');
        this.tool.addTexture(refraction, this.editor, this.editor.core.scene, 'refractionTexture', this.object, true).name('Refraction Texture');

        // Options
        const options = super.addOptions();
        options.add(this, '_convertToPbr').name('Convert to PBR...');
    }

    // Merges the current bump texture with a displacement texture;
    private async _mergeBumpWithDisplacement (): Promise<void> {
        if (!this.object.bumpTexture)
            return Window.CreateAlert('The material must have a Bump Texture applied on.');

        const displacement = await TexturePicker.Show(this.editor.core.scene, null, false, false);
        if (!displacement)
            return;
        
        w2utils.lock($('#' + this.divId)[0], 'Processing...', true);
        try {
            await GraphicsTools.MergeBumpWithDisplacement(<Texture> this.object.bumpTexture, <Texture> displacement);
        } catch (e) {
            // Catch silently.
        }
        w2utils.unlock($('#' + this.divId)[0]);
    }

    // Convert standard material to PBR material
    private _convertToPbr (): void {
        // Create material
        const pbr = new PBRMaterial(this.object.name + '_pbr', this.object.getScene());
        pbr.albedoColor = this.object.diffuseColor;
        pbr.albedoTexture = this.object.diffuseTexture;
        pbr.useAlphaFromAlbedoTexture = this.object.useAlphaFromDiffuseTexture;

        pbr.bumpTexture = this.object.bumpTexture;
        pbr.parallaxScaleBias = this.object.parallaxScaleBias;
        pbr.useParallax = this.object.useParallax;
        pbr.useParallaxOcclusion = this.object.useParallaxOcclusion;

        pbr.reflectivityColor = this.object.specularColor;
        pbr.reflectivityTexture = this.object.specularTexture;

        pbr.reflectionTexture = this.object.reflectionTexture;
        
        pbr.emissiveColor = this.object.emissiveColor;
        pbr.emissiveTexture = this.object.emissiveTexture;
        
        pbr.ambientColor = this.object.ambientColor;
        pbr.ambientTexture = this.object.ambientTexture;

        // Add tags to pbr
        Tags.AddTagsTo(pbr, 'added');

        // Reassign
        this.object.getBindedMeshes().forEach(m => m.material = pbr);

        // Special for multi materials
        this.editor.core.scene.meshes.forEach(m => {
            if (!m.material || !(m.material instanceof MultiMaterial))
                return;

            const multiMaterial = m.material;

            m.material.subMaterials.forEach((sm, index) => {
                if (sm === this.object)
                    multiMaterial.subMaterials[index] = pbr;
            });
        });

        // Update
        this.editor.inspector.refresh();
    }
}
