import {
    Scene, Texture,
    SpotLight, DirectionalLight,
    StandardRenderingPipeline, SSAORenderingPipeline, SSAO2RenderingPipeline, Light,
    DefaultRenderingPipeline, ColorCurves
} from 'babylonjs';

import AbstractEditionTool from '../edition-tool';
import Tools from '../../tools/tools';
import SceneManager from '../../scene/scene-manager';

import Picker from '../../gui/picker';

import PostProcessesExtension from '../../../extensions/post-process/post-processes';
import Extensions from '../../../extensions/extensions';

export default class PostProcessesTool extends AbstractEditionTool<Scene> {
    // Public members
    public divId: string = 'POST-PROCESSES-TOOL';
    public tabName: string = 'Post-Processes';

    // Private members
    private _standardEnabled: boolean = false;
    private _defaultEnabled: boolean = false;
    private _ssaoEnabled: boolean = false;
    private _ssao2Enabled: boolean = false;

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Scene;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(scene: Scene): void {
        super.update(scene);

        // Standard
        const standardPipeline = this.tool.addFolder('Standard');
        standardPipeline.open();

        this._standardEnabled = SceneManager.StandardRenderingPipeline !== null;
        standardPipeline.add(this, '_standardEnabled').name('Enable').onChange(async r => {
            if (!r) {
                SceneManager.StandardRenderingPipeline.dispose();
                SceneManager.StandardRenderingPipeline = null;
                delete this.editor.core.scene.postProcessRenderPipelineManager['_renderPipelines'].Standard;
            }
            else {
                const pipeline = new StandardRenderingPipeline('Standard', scene, 1.0, null, scene.cameras);
                pipeline.depthOfFieldDistance = 0.05;
                
                const lensflaredirt = await Tools.GetFile('assets/textures/lensflaredirt.png');
                pipeline.lensTexture = pipeline.lensFlareDirtTexture = Texture.CreateFromBase64String(await Tools.ReadFileAsBase64(lensflaredirt), 'lensflaredirt.png', scene);

                const lensstar = await Tools.GetFile('assets/textures/lensstar.png');
                pipeline.lensStarTexture = Texture.CreateFromBase64String(await Tools.ReadFileAsBase64(lensstar), 'lensstar.png', scene);

                const lenscolor = await Tools.GetFile('assets/textures/lenscolor.png');
                pipeline.lensColorTexture = Texture.CreateFromBase64String(await Tools.ReadFileAsBase64(lenscolor), 'lenscolor.png', scene);

                pipeline.lensTexture.url = pipeline.lensTexture.name = pipeline.lensTexture.url.replace('data:', '');
                pipeline.lensStarTexture.url = pipeline.lensStarTexture.name = pipeline.lensStarTexture.url.replace('data:', '');
                pipeline.lensColorTexture.url = pipeline.lensColorTexture.name = pipeline.lensColorTexture.url.replace('data:', '');

                SceneManager.StandardRenderingPipeline = pipeline;
            }

            // Update tool
            this.update(scene);

            // Check if extension is created
            this._checkExtension();
        });

        if (this._standardEnabled) {
            standardPipeline.add(this, '_editStandardAnimations').name('Edit animations...');

            const antialiasing = standardPipeline.addFolder('Anti Aliasing');
            antialiasing.open();
            antialiasing.add(SceneManager.StandardRenderingPipeline, 'fxaaEnabled').name('Enable FXAA');
            antialiasing.add(SceneManager.StandardRenderingPipeline, 'samples').min(1).max(32).name('Multisample Anti-Aliasing');
			
			const reflections = standardPipeline.addFolder('Screen Space Reflection');
            reflections.open();
            reflections.add(SceneManager.StandardRenderingPipeline, 'screenSpaceReflectionsEnabled').name('Enabled').onChange(r => this.update(scene));
            if (SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess) {
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'strength').name('Reflection Strength');
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'threshold').name('Reflection Threshold');
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'step').step(0.001).name('Step');
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'reflectionSpecularFalloffExponent').name('Specular Fall Off Exponent');
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'reflectionSamples').min(1).max(512).step(1).name('Reflection Samples');
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'enableSmoothReflections').name('Enable Smoothing Reflections');
                reflections.add(SceneManager.StandardRenderingPipeline.screenSpaceReflectionPostProcess, 'smoothSteps').min(1).max(32).name('Smooth steps');
            }

            const bloom = standardPipeline.addFolder('Bloom');
            bloom.open();
            bloom.add(SceneManager.StandardRenderingPipeline, 'BloomEnabled').name('Bloom Enabled');
            bloom.add(SceneManager.StandardRenderingPipeline, 'exposure').min(0).max(10).step(0.01).name('Exposure');
            bloom.add(SceneManager.StandardRenderingPipeline, 'brightThreshold').min(0).max(10).step(0.01).name('Bright Threshold');
            bloom.add(SceneManager.StandardRenderingPipeline, 'blurWidth').min(0).max(512).step(0.01).name('Blur Width');
            bloom.add(SceneManager.StandardRenderingPipeline, 'horizontalBlur').name('Horizontal Blur');

            const lensTexture = bloom.addFolder('Lens Dirt Texture');
            lensTexture.open();
            this.tool.addTexture(lensTexture, this.editor, this.editor.core.scene, 'lensTexture', SceneManager.StandardRenderingPipeline, false, false, texture => {
                SceneManager.StandardRenderingPipeline.lensFlareDirtTexture = <Texture> texture;
            }).name('Texture');

            const motionBlur = standardPipeline.addFolder('Motion Blur');
            motionBlur.open();
            motionBlur.add(SceneManager.StandardRenderingPipeline, 'MotionBlurEnabled').name('Motion Blur Enabled');
            motionBlur.add(SceneManager.StandardRenderingPipeline, 'motionBlurSamples').min(1).max(64).step(1).name('Samples Count');
            motionBlur.add(SceneManager.StandardRenderingPipeline, 'motionStrength').min(0).step(0.01).name('Strength');
            motionBlur.add(SceneManager.StandardRenderingPipeline, 'objectBasedMotionBlur').name('Object Based Motion Blur');

            const lensFlare = standardPipeline.addFolder('Lens Flare');
            lensFlare.open();
            lensFlare.add(SceneManager.StandardRenderingPipeline, 'LensFlareEnabled').name('Lens Flare Enabled');
            lensFlare.add(SceneManager.StandardRenderingPipeline, 'lensFlareStrength').min(0).max(100).step(0.01).name('Strength');
            lensFlare.add(SceneManager.StandardRenderingPipeline, 'lensFlareHaloWidth').min(0).max(2).step(0.01).name('Halo Width');
            lensFlare.add(SceneManager.StandardRenderingPipeline, 'lensFlareGhostDispersal').min(0).max(10).step(0.1).name('Ghost Dispersal');
            lensFlare.add(SceneManager.StandardRenderingPipeline, 'lensFlareDistortionStrength').min(0).max(500).step(0.1).name('Distortion Strength');

            const dof = standardPipeline.addFolder('Depth-Of-Field');
            dof.open();
            dof.add(SceneManager.StandardRenderingPipeline, 'DepthOfFieldEnabled').name('Depth-Of-Field Enabled');
            dof.add(SceneManager.StandardRenderingPipeline, 'depthOfFieldDistance').min(0).max(1).step(0.001).name('DOF Distance');
            dof.add(SceneManager.StandardRenderingPipeline, 'depthOfFieldBlurWidth').min(0).max(512).name('Blur Width');

            const hdr = standardPipeline.addFolder('HDR');
            hdr.open();
            hdr.add(SceneManager.StandardRenderingPipeline, 'HDREnabled').name('HDR Enabled');
            hdr.add(SceneManager.StandardRenderingPipeline, 'hdrMinimumLuminance').min(0).max(2).name('Minimum Luminance');
            hdr.add(SceneManager.StandardRenderingPipeline, 'hdrDecreaseRate').min(0).max(2).name('Decrease Rate');
            hdr.add(SceneManager.StandardRenderingPipeline, 'hdrIncreaseRate').min(0).max(2).name('Increase Rate');
            hdr.add(SceneManager.StandardRenderingPipeline, 'hdrAutoExposure').name('Auto Exposure');

            const vls = standardPipeline.addFolder('Volumetric Lights');
            vls.open();
            vls.add(SceneManager.StandardRenderingPipeline, 'VLSEnabled').name('Volumetric Lights Enabled').onChange(r => {
                if (!r)
                    return;
                
                const lights: Light[] = [];
                scene.lights.forEach(l => (l instanceof SpotLight || l instanceof DirectionalLight) && lights.push(l));

                const picker = new Picker('Select Light Emitter');
                picker.addItems(lights);

                if (SceneManager.StandardRenderingPipeline.sourceLight)
                    picker.addSelected([SceneManager.StandardRenderingPipeline.sourceLight]);

                picker.open((items) => {
                    if (items.length > 0)
                        SceneManager.StandardRenderingPipeline.sourceLight = <SpotLight | DirectionalLight> scene.getLightByName(items[0].name);
                    
                    this.update(scene);
                });
            });
            if (SceneManager.StandardRenderingPipeline.VLSEnabled) {
                vls.add(SceneManager.StandardRenderingPipeline, 'volumetricLightCoefficient').min(-2).max(2).step(0.01).name('Scattering Coefficient');
                vls.add(SceneManager.StandardRenderingPipeline, 'volumetricLightPower').min(0).max(10).step(0.01).name('Scattering Power');
                vls.add(SceneManager.StandardRenderingPipeline, 'volumetricLightBlurScale').min(0).max(64).step(1).name('Blur scale');
                vls.add(SceneManager.StandardRenderingPipeline, 'volumetricLightStepsCount').min(0).max(512).step(1).name('Steps count');
            }
        }

        // Default
        const def = this.tool.addFolder('Default');
        def.open();

        this._defaultEnabled = SceneManager.DefaultRenderingPipeline !== null;
        def.add(this, '_defaultEnabled').name('Enable').onChange(r => {
            if (!r) {
                SceneManager.DefaultRenderingPipeline.dispose();
                SceneManager.DefaultRenderingPipeline = null;
                delete this.editor.core.scene.postProcessRenderPipelineManager['_renderPipelines'].Default;
            }
            else {
                SceneManager.DefaultRenderingPipeline = new DefaultRenderingPipeline('Default', true, scene, scene.cameras, true);
                var curve = new ColorCurves();
                curve.globalHue = 200;
                curve.globalDensity = 80;
                curve.globalSaturation = 80;
                curve.highlightsHue = 20;
                curve.highlightsDensity = 80;
                curve.highlightsSaturation = -80;
                curve.shadowsHue = 2;
                curve.shadowsDensity = 80;
                curve.shadowsSaturation = 40;
                SceneManager.DefaultRenderingPipeline.imageProcessing.colorCurves = curve;
                SceneManager.DefaultRenderingPipeline.depthOfField.focalLength = 150;
                SceneManager.DefaultRenderingPipeline.chromaticAberration.direction.x = Math.PI * 2;
                SceneManager.DefaultRenderingPipeline.chromaticAberration.direction.y = Math.PI * 2;
            }

            // Update tool
            this.update(scene);

            // Check if extension is created
            this._checkExtension();
        });

        if (this._defaultEnabled) {
            // Anti aliasing
            const antialiasing = def.addFolder('Anti Aliasing');
            antialiasing.open();

            antialiasing.add(SceneManager.DefaultRenderingPipeline, 'samples').min(1).max(32).name('Multisample Anti-Aliasing');
            antialiasing.add(SceneManager.DefaultRenderingPipeline, 'fxaaEnabled').name('Fast Approximate Anti-Aliasing');

            // Image processing
            const imageProcessing = def.addFolder('Image Processing');
            imageProcessing.open();

            imageProcessing.add(SceneManager.DefaultRenderingPipeline.imageProcessing, 'toneMappingEnabled').name('Tone Mapping');
            imageProcessing.add(SceneManager.DefaultRenderingPipeline.imageProcessing, 'contrast').min(0).max(4).name('Contrast');
            imageProcessing.add(SceneManager.DefaultRenderingPipeline.imageProcessing, 'exposure').min(0).max(10).name('Exposure');

            // Bloom
            const bloom = def.addFolder('Bloom');
            bloom.open();

            bloom.add(SceneManager.DefaultRenderingPipeline, 'bloomEnabled').name('Enable Bloom');
            bloom.add(SceneManager.DefaultRenderingPipeline, 'bloomKernel').min(0).max(500).name('Kernel');
            bloom.add(SceneManager.DefaultRenderingPipeline, 'bloomWeight').min(0).max(10).name('Weight');
            bloom.add(SceneManager.DefaultRenderingPipeline, 'bloomThreshold').min(0).max(10).name('Threshold');
            bloom.add(SceneManager.DefaultRenderingPipeline, 'bloomScale').min(0).max(10).name('Scale');

            // Chromatic aberration
            const chromatic = def.addFolder('Chromatic Aberration');
            chromatic.open();

            chromatic.add(SceneManager.DefaultRenderingPipeline, 'chromaticAberrationEnabled').name('Enable Chromatic Aberration');
            chromatic.add(SceneManager.DefaultRenderingPipeline.chromaticAberration, 'aberrationAmount').min(-1000).max(1000).name('Amount');
            chromatic.add(SceneManager.DefaultRenderingPipeline.chromaticAberration, 'radialIntensity').min(0.1).max(15).step(0.01).name('Radial Intensity');
            chromatic.add(SceneManager.DefaultRenderingPipeline.chromaticAberration.direction, 'x').min(0).max(Math.PI * 2).step(0.01).name('Direction').onChange(r => {
                SceneManager.DefaultRenderingPipeline.chromaticAberration.direction.x = Math.sin(r);
                SceneManager.DefaultRenderingPipeline.chromaticAberration.direction.y = Math.cos(r);
            });

            // Sharpen
            const sharpen = def.addFolder('Sharpen');
            sharpen.open();

            sharpen.add(SceneManager.DefaultRenderingPipeline, 'sharpenEnabled').name('Enable Sharpen');
            sharpen.add(SceneManager.DefaultRenderingPipeline.sharpen, 'edgeAmount').min(0).max(4).step(0.01).name('Edge Amount');
            sharpen.add(SceneManager.DefaultRenderingPipeline.sharpen, 'colorAmount').min(0).max(2).step(0.01).name('Color Amount');

            // Grain
            const grain = def.addFolder('Grain');
            grain.open();

            grain.add(SceneManager.DefaultRenderingPipeline, 'grainEnabled').name('Enable Grain');
            grain.add(SceneManager.DefaultRenderingPipeline.grain, 'intensity').min(0).max(100).step(0.1).name('Intensity');
            grain.add(SceneManager.DefaultRenderingPipeline.grain, 'animated').name('Animated');
        }

        // SSAO
        const ssao = this.tool.addFolder('SSAO');
        ssao.open();

        this._ssaoEnabled = SceneManager.SSAORenderingPipeline !== null;
        ssao.add(this, '_ssaoEnabled').name('Enable').onChange(async r => {
            if (!r) {
                SceneManager.SSAORenderingPipeline.dispose();
                SceneManager.SSAORenderingPipeline = null;
                delete this.editor.core.scene.postProcessRenderPipelineManager['_renderPipelines'].SSAO;
            }
            else {
                const pipeline = new SSAORenderingPipeline('SSAO', scene, { ssaoRatio: 0.5, combineRatio: 1.0 }, scene.cameras);
                pipeline.fallOff = 0.000001;
                pipeline.area = 1.0;
                pipeline.radius = 0.0004;
                pipeline.totalStrength = 2;
                pipeline.base = 1.3;

                SceneManager.SSAORenderingPipeline = pipeline;
            }

            // Update tool
            this.update(scene);

            // Check if extension is created
            this._checkExtension();
        });

        if (this._ssaoEnabled) {
            ssao.add(SceneManager.SSAORenderingPipeline, 'totalStrength').min(0).step(0.0001).name('Strength');
            ssao.add(SceneManager.SSAORenderingPipeline, 'radius').min(0).step(0.0001).name('Radius');
            ssao.add(SceneManager.SSAORenderingPipeline, 'area').min(0).step(0.0001).name('Area');
            ssao.add(SceneManager.SSAORenderingPipeline, 'fallOff').min(0).step(0.0001).name('Fall Off');
            ssao.add(SceneManager.SSAORenderingPipeline, 'base').min(0).step(0.0001).name('Base');
        }

        // SSAO 2
        const ssao2 = this.tool.addFolder('SSAO 2');
        ssao2.open();

        this._ssao2Enabled = SceneManager.SSAO2RenderingPipeline !== null;
        ssao2.add(this, '_ssao2Enabled').name('Enable').onChange(r => {
            if (!r) {
                SceneManager.SSAO2RenderingPipeline.dispose();
                SceneManager.SSAO2RenderingPipeline = null;
                delete this.editor.core.scene.postProcessRenderPipelineManager['_renderPipelines'].SSAO2;
            }
            else {
                const pipeline = new SSAO2RenderingPipeline('SSAO2', scene, { ssaoRatio: 0.5, blurRatio: 0.5 }, scene.cameras);
                pipeline.radius = 3.5;
                pipeline.totalStrength = 1.3;
                pipeline.expensiveBlur = true;
                pipeline.samples = 16;
                pipeline.maxZ = 250;

                SceneManager.SSAO2RenderingPipeline = pipeline;
            }

            // Update tool
            this.update(scene);

            // Check if extension is created
            this._checkExtension();
        });

        if (this._ssao2Enabled) {
            ssao2.add(SceneManager.SSAO2RenderingPipeline, 'totalStrength').min(0).step(0.0001).name('Strength');
            ssao2.add(SceneManager.SSAO2RenderingPipeline, 'radius').min(0).step(0.0001).name('Radius');
            ssao2.add(SceneManager.SSAO2RenderingPipeline, 'expensiveBlur').name('Expensive Blur');
            ssao2.add(SceneManager.SSAO2RenderingPipeline, 'maxZ').min(1).step(0.01).name('Max Z');
            ssao2.add(SceneManager.SSAO2RenderingPipeline, 'samples').min(2).max(64).step(1).name('Samples');
        }
    }

    // Checks if the post processes extension is created
    private async _checkExtension (): Promise<void> {
        await Tools.ImportScript('./build/src/extensions/post-process/post-processes.js');
        
        SceneManager.PostProcessExtension =
            SceneManager.PostProcessExtension ||
            Extensions.RequestExtension<PostProcessesExtension>(this.editor.core.scene, 'PostProcess');
    }

    // Edit the animations of the standard rendering pipeline
    private async _editStandardAnimations (): Promise<void> {
        await this.editor.addEditPanelPlugin('animation-editor', false, 'Animations Editor - Standard', SceneManager.StandardRenderingPipeline);
    }
}
