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
        
        // Albedo
        const albedo = this.tool.addFolder('Albedo');
        albedo.open();
        this.tool.addTexture(albedo, this.editor.core.scene, 'albedoTexture', this.object).name('Albedo Texture');
        this.tool.addColor(albedo, 'Color', this.object.albedoColor).open();

        // Bump
        const bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor.core.scene, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        bump.add(this.object, 'useParallax').name('Use Parallax');
        bump.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion');
        bump.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');

        // Reflectivity
        const reflectivity = this.tool.addFolder('Reflectivity');
        reflectivity.open();
        this.tool.addTexture(reflectivity, this.editor.core.scene, 'reflectivityTexture', this.object).name('Reflectivity Texture');
        this.tool.addColor(reflectivity, 'Color', this.object.reflectivityColor).open();

        // Reflection
        const reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor.core.scene, 'reflectionTexture', this.object, true, true).name('Reflection Texture');
        this.tool.addColor(reflection, 'Color', this.object.reflectionColor).open();

        // Microsurface
        const micro = this.tool.addFolder('Micro Surface');
        micro.open();
        this.tool.addTexture(micro, this.editor.core.scene, 'microSurfaceTexture', this.object, false).name('Micro Surface Texture');
        micro.add(this.object, 'microSurface').min(0).max(1).name('Micro Surface');
        micro.add(this.object, 'useAutoMicroSurfaceFromReflectivityMap').name('Use Auto Micro Surface From Reflectivity Map');
        micro.add(this.object, 'useMicroSurfaceFromReflectivityMapAlpha').name('Use Micro Surface From Reflectivity Map Alpha');

        // Options
        super.addOptions();
    }
}
