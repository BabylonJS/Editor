import { PBRMetallicRoughnessMaterial } from 'babylonjs';

import MaterialTool from './material-tool';
import Tools from '../../tools/tools';

export default class PBRMetallicRoughnessMaterialTool extends MaterialTool<PBRMetallicRoughnessMaterial> {
    // Public members
    public divId: string = 'PBR-METALLIC-ROUGHNESS-MATERIAL-TOOL';
    public tabName: string = 'PBR Metallic Roughness';

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return super.isSupported(object) && this.object instanceof PBRMetallicRoughnessMaterial;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(object: any): void {
        super.update(object);

        // Base Color
        const baseColor = this.tool.addFolder('Base');
        baseColor.open();

        this.tool.addColor(baseColor, 'Base Color', this.object.baseColor).open();
        this.tool.addTexture(baseColor, this.editor, 'baseTexture', this.object, false).name('Texture');

        // Bump
        const normal = this.tool.addFolder('Normal');
        normal.open();
        this.tool.addTexture(normal, this.editor, 'normalTexture', this.object).name('Normal Texture');
        normal.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        normal.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');

        // Reflection
        const reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor, 'environmentTexture', this.object, true, false).name('Environment Texture');

        // Metallic Roughness
        const metallic = this.tool.addFolder('Metallic Roughness');
        metallic.open();
        metallic.add(this.object, 'roughness').step(0.01).name('Roughness');
        metallic.add(this.object, 'metallic').step(0.01).name('Metallic');
        this.tool.addTexture(metallic, this.editor, 'metallicRoughnessTexture', this.object).name('Metallic Roughness Texture');

        // Emissive
        const emissive = this.tool.addFolder('Emissive');
        emissive.open();
        this.tool.addColor(emissive, 'Color', this.object.emissiveColor).open();
        this.tool.addTexture(emissive, this.editor, 'emissiveTexture', this.object).name('Emissive Texture');

        // Lightmap
        const lightmap = this.tool.addFolder('Lightmap');
        lightmap.open();
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, 'lightmapTexture', this.object).name('Lightmap Texture');

        // Occlusion
        const occlusion = this.tool.addFolder('Occlusion');
        occlusion.open();
        occlusion.add(this.object, 'occlusionStrength').name('Occlusion Strength');
        this.tool.addTexture(occlusion, this.editor, 'occlusionTexture', this.object).name('Occlusion Texture');

        // Options
        super.addOptions();
    }
}
