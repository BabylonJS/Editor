import { PBRMaterial }  from 'babylonjs';

import MaterialTool from './material-tool';
import UndoRedo from '../../tools/undo-redo';

export default class PBRMaterialTool extends MaterialTool<PBRMaterial> {
    // Public members
    public divId: string = 'PBR-TOOL';
    public tabName: string = 'PBR Material';

    // Private members
    private _metallic: number = 0.0;
    private _metallicEnabled: boolean = false;

    private _roughness: number = 0.0;
    private _roughnessEnabled: boolean = false;

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof PBRMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);
        
        // Options
        const pbrOptions = this.tool.addFolder('PBR Options');
        pbrOptions.open();
        pbrOptions.add(this.object, 'forceIrradianceInFragment').name('Force Irradiance In Fragment');
        pbrOptions.add(this.object, 'forceNormalForward').name('Force Normal Forward');
        pbrOptions.add(this.object, 'enableSpecularAntiAliasing').name('Force Specular Anti-Aliasing');
        pbrOptions.add(this.object, 'usePhysicalLightFalloff').name('Use Physical Light Falloff');
        pbrOptions.add(this.object, 'directIntensity').min(0).step(0.01).name('Direct Intensity');

        // Albedo
        const albedo = this.tool.addFolder('Albedo');
        albedo.open();
        this.tool.addTexture(albedo, this.editor, this.editor.core.scene, 'albedoTexture', this.object).name('Albedo Texture');
        this.tool.addColor(albedo, 'Color', this.object.albedoColor).open();

        // Bump
        const bump = this.tool.addFolder('Bump');
        this.tool.addTexture(bump, this.editor, this.editor.core.scene, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        bump.add(this.object, 'useParallax').name('Use Parallax');
        bump.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion');
        bump.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');

        // Reflectivity
        const reflectivity = this.tool.addFolder('Reflectivity');
        reflectivity.open();
        this.tool.addTexture(reflectivity, this.editor, this.editor.core.scene, 'reflectivityTexture', this.object).name('Reflectivity Texture');
        this.tool.addColor(reflectivity, 'Color', this.object.reflectivityColor).open();

        // Reflection
        const reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor, this.editor.core.scene, 'reflectionTexture', this.object, true, false).name('Reflection Texture');
        this.tool.addColor(reflection, 'Color', this.object.reflectionColor).open();
        reflection.add(this.object, 'environmentIntensity').step(0.01).name('Environment Intensity');

        // Microsurface
        const micro = this.tool.addFolder('Micro Surface');
        this.tool.addTexture(micro, this.editor, this.editor.core.scene, 'microSurfaceTexture', this.object, false).name('Micro Surface Texture');
        micro.add(this.object, 'microSurface').min(0).max(1).name('Micro Surface');
        micro.add(this.object, 'useAutoMicroSurfaceFromReflectivityMap').name('Use Auto Micro Surface From Reflectivity Map');
        micro.add(this.object, 'useMicroSurfaceFromReflectivityMapAlpha').name('Use Micro Surface From Reflectivity Map Alpha');

        // Metallic
        const metallic = this.tool.addFolder('Metallic / Roughness');
        metallic.add(this.object, 'useMetallnessFromMetallicTextureBlue').name('Metallness From Metallic Texture Blue');
        metallic.add(this.object, 'useRoughnessFromMetallicTextureAlpha').name('Use Roughness From Metallic Texture Alpha');
        metallic.add(this.object, 'useRoughnessFromMetallicTextureGreen').name('Use Roughness From Metallic Texture Green');
        this.tool.addTexture(metallic, this.editor, this.editor.core.scene, 'metallicTexture', this.object, false, false, t => this.update(this.object)).name('Metallic Texture');

        const metallicWorkflow = metallic.addFolder('Metallic Workflow');
        metallicWorkflow.open();

        this._metallic = this.object.metallic || this._metallic;
        this._metallicEnabled = this.object.metallic !== null && this.object.metallic !== undefined;
        metallicWorkflow.add(this, '_metallicEnabled').name('Metallic Enabled').onFinishChange((r, i) => {
            UndoRedo.Push({
                undo: () => {
                    this.object.metallic = r ? null : this._metallic;
                    this._metallicEnabled = i;
                },
                redo: () => {
                    this.object.metallic = r ? this._metallic : null;
                    this._metallicEnabled = r;
                }
            });
        });
        
        const metallicValue = metallicWorkflow.add(this, '_metallic').min(0).step(0.01).name('Metallic');
        metallicValue.onChange(r => this._metallicEnabled && (this.object.metallic = r));
        metallicValue.onFinishChange((r, i) => this._metallicEnabled && UndoRedo.Push({ object: this.object, property: 'metallic', from: i, to: r }));

        const roughnessWorkflow = metallic.addFolder('Roughness Workflow');
        roughnessWorkflow.open();

        this._roughnessEnabled = this.object.roughness !== null && this.object.roughness !== undefined;
        this._roughness = this.object.roughness || this._roughness;
        roughnessWorkflow.add(this, '_roughnessEnabled').name('Roughness Enabled').onFinishChange((r, i) => {
            UndoRedo.Push({
                undo: () => {
                    this.object.roughness = r ? null : this._roughness;
                    this._roughnessEnabled = i;
                },
                redo: () => {
                    this.object.roughness = r ? this._roughness : null;
                    this._roughnessEnabled = r;
                }
            });
        });
        
        const roughnessValue = roughnessWorkflow.add(this, '_roughness').min(0).step(0.01).name('Roughness');
        roughnessValue.onChange(r => this._roughnessEnabled && (this.object.roughness = r));
        roughnessValue.onFinishChange((r, i) => this._roughnessEnabled && UndoRedo.Push({ object: this.object, property: 'roughness', from: i, to: r }));

        // Sub surface
        const subSurface = this.tool.addFolder('Sub Surface');
        this.tool.addColor(subSurface, 'Tint Color', this.object.subSurface.tintColor).open();
        this.tool.addTexture(subSurface.addFolder('Thickness Texture'), this.editor, this.editor.core.scene, 'thicknessTexture', this.object.subSurface, false);
        subSurface.add(this.object.subSurface, 'useMaskFromThicknessTexture').name('Use Mask From Thickness Texture');

        // Sub surface Refraction
        const subSurfaceRefraction = this.tool.addFolder('Sub Surface (Refraction)');
        subSurfaceRefraction.add(this.object.subSurface, 'isRefractionEnabled').name('Refraction Enabled');
        subSurfaceRefraction.add(this.object.subSurface, 'refractionIntensity').name('Refraction Intensity');
        subSurfaceRefraction.add(this.object.subSurface, 'indexOfRefraction').name('Index Of Refraction');
        subSurfaceRefraction.add(this.object.subSurface, 'minimumThickness').name('Index Of Refraction');
        subSurfaceRefraction.add(this.object.subSurface, 'minimumThickness').name('Index Of Refraction');

        // Sub surface Translucency
        const subSurfaceTranslucency = this.tool.addFolder('Sub Surface (Translucency)');
        subSurfaceTranslucency.add(this.object.subSurface, 'isTranslucencyEnabled').name('Translucency Enabled');
        subSurfaceTranslucency.add(this.object.subSurface, 'translucencyIntensity').name('Translucency Intensity');

        // Clear Coat
        const clearCoat = this.tool.addFolder('Clear Coat');
        clearCoat.add(this.object.clearCoat, 'isEnabled').name('Clear Coat Enabled');
        clearCoat.add(this.object.clearCoat, 'roughness').min(0).step(0.01).name('Roughness');
        clearCoat.add(this.object.clearCoat, 'indexOfRefraction').min(0).step(0.01).name('Index Of Refraction');
        this.tool.addTexture(clearCoat.addFolder('Bump Texture'), this.editor, this.editor.core.scene, 'bumpTexture', this.object.clearCoat, false, false);

        clearCoat.add(this.object.clearCoat, 'isTintEnabled').name('Tint Enabled');
        clearCoat.add(this.object.clearCoat, 'tintColorAtDistance').min(0).step(0.01).name('Tint Color At Distance');
        clearCoat.add(this.object.clearCoat, 'tintThickness').min(0).step(0.01).name('Tint Thickness');

        // Anisotropy
        const anisotropy = this.tool.addFolder('Anisotropy');
        anisotropy.add(this.object.anisotropy, 'isEnabled').name('Anisotropy Enabled');
        anisotropy.add(this.object.anisotropy, 'intensity').min(0).step(0.01).name('Intensity');        
        this.tool.addVector(anisotropy, 'Direction', this.object.anisotropy.direction);     
        this.tool.addTexture(anisotropy.addFolder('Texture'), this.editor, this.editor.core.scene, 'texture', this.object.anisotropy, false, false);

        // Sheen
        const sheen = this.tool.addFolder('Sheen');
        sheen.add(this.object.sheen, 'isEnabled').name('Sheen Enabled');
        sheen.add(this.object.sheen, 'intensity').min(0).step(0.01).name('Intensity');
        this.tool.addColor(sheen, 'Color', this.object.sheen.color);
        this.tool.addTexture(sheen.addFolder('Texture'), this.editor, this.editor.core.scene, 'texture', this.object.sheen, false, false);

        // Opacity
        const opacity = this.tool.addFolder('Opacity');
        opacity.add(this.object, 'useRadianceOverAlpha').name('Use Radiance Over Alpha');
        opacity.add(this.object, 'useSpecularOverAlpha').name('Use Specular Over Alpha');

        // Emissive
        const emissive = this.tool.addFolder('Emissive');
        this.tool.addColor(emissive, 'Emissive', this.object.emissiveColor).open();
        emissive.add(this.object, 'emissiveIntensity').step(0.01).name('Emissive Intensity');
        this.tool.addTexture(emissive, this.editor, this.editor.core.scene, 'emissiveTexture', this.object).name('Emissive Texture');

        // Ambient
        const ambient = this.tool.addFolder('Ambient');
        this.tool.addColor(ambient, 'Ambient', this.object.ambientColor).open();
        this.tool.addTexture(ambient, this.editor, this.editor.core.scene, 'ambientTexture', this.object).name('Ambient Texture');
        ambient.add(this.object, 'ambientTextureStrength').step(0.01).name('Ambient Texture Strength');

        // Light map
        const lightmap = this.tool.addFolder('Lightmap');
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, this.editor.core.scene, 'lightmapTexture', this.object).name('Lightmap Texture');

        // Refraction
        const refraction = this.tool.addFolder('Refraction (backward compatibility)');
        refraction.add(this.object, 'indexOfRefraction').step(0.01).name('Index of Refraction');
        refraction.add(this.object, 'invertRefractionY').name('Invert Y');
        refraction.add(this.object, 'linkRefractionWithTransparency').name('Link Refraction With Transparency');
        this.tool.addTexture(refraction, this.editor, this.editor.core.scene, 'refractionTexture', this.object, true).name('Refraction Texture');

        // Options
        super.addOptions();
    }
}
