import { Light, DirectionalLight, PointLight, SpotLight, ShadowGenerator, SerializationHelper, Tags, CascadedShadowGenerator, IShadowGenerator } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';
import Dialog from '../gui/dialog';

export default class LightTool extends AbstractEditionTool<Light> {
    // Public members
    public divId: string = 'LIGHT-TOOL';
    public tabName: string = 'Light';

    // Private members
    private _generatesShadows: boolean = false;
    private _shadowMapSize: string = '512';
    private _darkness: number = 0;
    private _intensityMode: string = '';

    private _cascadeFilter: string = '';
    private _cascadedQuality: string = '';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Light;
    }

	/**
	* Updates the edition tool
	* @param light the object selected in the graph
	*/
    public update(light: Light): void {
        super.update(light);
        super.setTabName(Tools.GetConstructorName(light).replace('Light', ''));

        // Reset
        if (light.metadata && light.metadata.original) {
            this.tool.add(this, 'resetToOriginal').name('Reset to original');
        }

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(light, 'intensity').min(0).step(0.01).name('Intensity');
        common.add(light, 'range').min(0).step(0.01).name('Range');
        common.add(light, 'radius').min(0).step(0.01).name('Radius');

        // Colors
        const colors = this.tool.addFolder('Colors');
        colors.open();

        this.tool.addColor(colors, 'Diffuse', light.diffuse).open();
        this.tool.addColor(colors, 'Specular', light.specular).open();

        // Mode
        const mode = this.tool.addFolder('Mode');
        mode.open();

        const modes: string[] = ['INTENSITYMODE_AUTOMATIC', 'INTENSITYMODE_LUMINOUSPOWER', 'INTENSITYMODE_LUMINOUSINTENSITY', 'INTENSITYMODE_ILLUMINANCE', 'INTENSITYMODE_LUMINANCE'];
        for (const m of modes) {
            if (light.intensityMode === Light[m]) {
                this._intensityMode = m;
                break;
            }
        }
        mode.add(this, '_intensityMode', modes).name('Intensity').onChange(r => light.intensityMode = Light[r]);


        // Spot
        if (light instanceof SpotLight) {
            const spot = this.tool.addFolder('Spot Light');
            spot.open();
            spot.add(light, 'angle').step(0.01).name('Angle');
            spot.add(light, 'exponent').step(0.01).name('Exponent');
        }

        // Shadows
        if (light instanceof DirectionalLight || light instanceof PointLight || light instanceof SpotLight) {
            const shadowGenerator = <IShadowGenerator> light.getShadowGenerator();
            shadowGenerator ? this._generatesShadows = true : this._generatesShadows = false;

            const shadows = this.tool.addFolder('Shadows');
            shadows.open();

            shadows.add(this, '_generatesShadows').name('Generate Shadows').onFinishChange(async (r) => {
                if (!r)
                    light.getShadowGenerator().dispose();
                else {
                    const size = parseInt(this._shadowMapSize);
                    const cascaded = light instanceof DirectionalLight && await Dialog.CreateConfirm('Cascaded Shadow Generator', 'Do you want to create a Cascaded Shadow Generator?');

                    let sg: IShadowGenerator;
                    if (cascaded)
                        sg = new CascadedShadowGenerator(size, <DirectionalLight> light);
                    else
                        sg = new ShadowGenerator(size, light);
                    
                    Tags.AddTagsTo(sg, 'added');
                }

                this.editor.inspector.setObject(light);
            });
            
            shadows.add(light, 'shadowEnabled').name('Enable Shadows');

            const sizes: string[] = [];
            const max = this.editor.core.engine.getCaps().maxTextureSize;

            let current = 8;
            while (current < max) {
                current <<= 1;
                sizes.push(current.toString());
            }

            shadows.add(this, '_shadowMapSize', sizes).name('Shadow Map Size').onFinishChange(r => shadowGenerator && shadowGenerator.getShadowMap().resize(parseInt(r)));

            if (shadowGenerator) {
                if (shadowGenerator instanceof ShadowGenerator) {
                    this._darkness = shadowGenerator.getDarkness();

                    shadows.add(this, '_darkness').min(0).max(1).step(0.01).name('Darkness').onChange(r => shadowGenerator.setDarkness(r));
                    shadows.add(shadowGenerator, 'bias').min(0).max(1).step(0.0000001).name('Bias');
                    shadows.add(shadowGenerator, 'blurBoxOffset').min(0).max(10).step(1).name('Blur Box Offset');
                    shadows.add(shadowGenerator, 'blurScale').min(0).max(16).step(1).name('Blur Scale');
                    shadows.add(shadowGenerator, 'useKernelBlur').name('Use Kernel Blur');
                    shadows.add(shadowGenerator, 'blurKernel').min(0).max(512).step(1).name('Blur Kernel');

                    shadows.add(shadowGenerator, 'usePoissonSampling').name('Use Poisson Sampling');
                    shadows.add(shadowGenerator, 'useExponentialShadowMap').name('Use Exponential Shadow Map');
                    shadows.add(shadowGenerator, 'useBlurExponentialShadowMap').name('Use Blur Exponential Shadow Map');
                    shadows.add(shadowGenerator, 'useCloseExponentialShadowMap').name('Use Close Exponential Shadow Map');
                    shadows.add(shadowGenerator, 'useBlurCloseExponentialShadowMap').name('Use Blur Close Exponential Shadow Map');
                }
                else if (shadowGenerator instanceof CascadedShadowGenerator) {
                    this._darkness = shadowGenerator.getDarkness();
                    shadows.add(this, '_darkness').min(0).max(1).step(0.01).name('Darkness').onChange(r => shadowGenerator.setDarkness(r));
                   
                    shadows.add(shadowGenerator, 'bias').min(0).max(1).step(0.0000001).name('Bias');
                    shadows.add(shadowGenerator, 'normalBias').min(0).max(1).step(0.0000001).name('Normal Bias');
                    shadows.add(shadowGenerator, 'frustumEdgeFalloff').step(0.0000001).name('Frustum Edge Falloff');
                    shadows.add(shadowGenerator, 'stabilizeCascades').name('Stabilize Cascades');
                    
                    shadows.add(shadowGenerator, 'usePercentageCloserFiltering').name('Use Percentage Closer Filtering');
                    switch (shadowGenerator.filter) {
                        case CascadedShadowGenerator.FILTER_NONE: this._cascadeFilter = 'FILTER_NONE'; break;
                        case CascadedShadowGenerator.FILTER_PCF: this._cascadeFilter = 'FILTER_PCF'; break;
                        case CascadedShadowGenerator.FILTER_PCSS: this._cascadeFilter = 'FILTER_PCSS'; break;
                        default: this._cascadeFilter = 'FILTER_NONE'; break;
                    }
                    shadows.add(this, '_cascadeFilter', ['FILTER_NONE', 'FILTER_PCF', 'FILTER_PCSS']).name('Filter').onChange((r) => shadowGenerator.filter = CascadedShadowGenerator[r]);
                    switch (shadowGenerator.filteringQuality) {
                        case CascadedShadowGenerator.QUALITY_LOW: this._cascadedQuality = 'QUALITY_LOW'; break;
                        case CascadedShadowGenerator.QUALITY_MEDIUM: this._cascadedQuality = 'QUALITY_MEDIUM'; break;
                        case CascadedShadowGenerator.QUALITY_HIGH: this._cascadedQuality = 'QUALITY_HIGH'; break;
                        default: this._cascadedQuality = 'QUALITY_LOW'; break;
                    }
                    shadows.add(this, '_cascadedQuality', ['QUALITY_LOW', 'QUALITY_MEDIUM', 'QUALITY_HIGH']).name('Filtering Quality').onChange((r) => shadowGenerator.filteringQuality = CascadedShadowGenerator[r]);

                    shadows.add(shadowGenerator, 'useContactHardeningShadow').name('Use Contact Hardening Shadow');
                    shadows.add(shadowGenerator, 'contactHardeningLightSizeUVRatio').step(0.0000001).name('Contact Hardening Light Size UV Ratio');

                    // shadows.add(shadowGenerator, 'numCascades', ["4", "5", "6", "7", "8"]).name('Cascades Count').onChange((r) => shadowGenerator.numCascades = parseInt(r));
                    shadows.add(shadowGenerator, 'forceBackFacesOnly').name('Force Back Faces Only');
                    shadows.add(shadowGenerator, 'lambda').min(0).max(1).step(0.01).name('Lambda');
                    shadows.add(shadowGenerator, 'penumbraDarkness').min(0).max(1).step(0.01).name('Penumbra Darkness');
                    shadows.add(shadowGenerator, 'cascadeBlendPercentage').min(0).max(1).step(0.01).name('Cascade Blend Percentage');
                    shadows.add(shadowGenerator, 'depthClamp').name('Depth Clamp');

                    shadows.add(shadowGenerator, 'debug').name('debug');
                }
            }
        }
    }

    /**
     * Resets the current light to the original one
     */
    protected resetToOriginal (): void {
        SerializationHelper.Parse(() => this.object, this.object.metadata.original, this.object.getScene(), 'file:');
        setTimeout(() => {
            Tags.RemoveTagsFrom(this.object, 'modified');
            this.editor.graph.updateObjectMark(this.object);
        }, 1);
        this.editor.inspector.updateDisplay();
    }
}
