import { PBRMaterial }  from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class PBRMaterialTool extends MaterialTool<PBRMaterial> {
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
        
        // Albedo
        const albedo = this.tool.addFolder('Albedo');
        albedo.open();
        this.tool.addTexture(albedo, this.editor, 'albedoTexture', this.object).name('Albedo Texture');
        this.tool.addColor(albedo, 'Color', this.object.albedoColor).open();

        // Bump
        const bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        bump.add(this.object, 'useParallax').name('Use Parallax');
        bump.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion');
        bump.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');

        // Reflectivity
        const reflectivity = this.tool.addFolder('Reflectivity');
        reflectivity.open();
        this.tool.addTexture(reflectivity, this.editor, 'reflectivityTexture', this.object).name('Reflectivity Texture');
        this.tool.addColor(reflectivity, 'Color', this.object.reflectivityColor).open();

        // Reflection
        const reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor, 'reflectionTexture', this.object, true, true).name('Reflection Texture');
        this.tool.addColor(reflection, 'Color', this.object.reflectionColor).open();
        reflection.add(this.object, 'environmentIntensity').step(0.01).name('Environment Intensity');

        // Microsurface
        const micro = this.tool.addFolder('Micro Surface');
        micro.open();
        this.tool.addTexture(micro, this.editor, 'microSurfaceTexture', this.object, false).name('Micro Surface Texture');
        micro.add(this.object, 'microSurface').min(0).max(1).name('Micro Surface');
        micro.add(this.object, 'useAutoMicroSurfaceFromReflectivityMap').name('Use Auto Micro Surface From Reflectivity Map');
        micro.add(this.object, 'useMicroSurfaceFromReflectivityMapAlpha').name('Use Micro Surface From Reflectivity Map Alpha');

        // Metallic
        const metallic = this.tool.addFolder('Metallic');
        metallic.open();
        metallic.add(this.object, 'useMetallnessFromMetallicTextureBlue').name('Metallness From Metallic Texture Blue');
        metallic.add(this.object, 'useRoughnessFromMetallicTextureAlpha').name('Use Roughness From Metallic Texture Alpha');
        metallic.add(this.object, 'useRoughnessFromMetallicTextureGreen').name('Use Roughness From Metallic Texture Green');
        this.tool.addTexture(metallic, this.editor, 'metallicTexture', this.object, false).name('Metallic Texture');

        // Emissive
        const emissive = this.tool.addFolder('Emissive');
        emissive.open();
        this.tool.addColor(emissive, 'Emissive', this.object.emissiveColor).open();
        emissive.add(this.object, 'emissiveIntensity').step(0.01).name('Emissive Intensity');
        this.tool.addTexture(emissive, this.editor, 'emissiveTexture', this.object).name('Emissive Texture');

        // Ambient
        const ambient = this.tool.addFolder('Ambient');
        ambient.open();
        this.tool.addColor(ambient, 'Ambient', this.object.ambientColor).open();
        this.tool.addTexture(ambient, this.editor, 'ambientTexture', this.object).name('Ambient Texture');
        ambient.add(this.object, 'ambientTextureStrength').step(0.01).name('Ambient Texture Strength');

        // Light map
        const lightmap = this.tool.addFolder('Lightmap');
        lightmap.open();
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, 'lightmapTexture', this.object).name('Lightmap Texture');

        // Refraction
        const refraction = this.tool.addFolder('Refraction');
        refraction.open();
        refraction.add(this.object, 'indexOfRefraction').step(0.01).name('Index of Refraction');
        refraction.add(this.object, 'invertRefractionY').name('Invert Y');
        refraction.add(this.object, 'linkRefractionWithTransparency').name('Link Refraction With Transparency');
        this.tool.addTexture(refraction, this.editor, 'refractionTexture', this.object, true).name('Refraction Texture');

        // Options
        super.addOptions();
    }
}
