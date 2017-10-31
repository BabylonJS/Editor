import {
    Scene, Texture,
    SpotLight, DirectionalLight,
    StandardRenderingPipeline
} from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';
import SceneManager from '../scene/scene-manager';

import Picker from '../gui/picker';

export default class PostProcessesTool extends AbstractEditionTool<Scene> {
    // Public members
    public divId: string = 'POST-PROCESSES-TOOL';
    public tabName: string = 'Post-Processes';

    // Private members
    private _standardEnabled: boolean = false;

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

        // Default
        const standardPipeline = this.tool.addFolder('Default');
        standardPipeline.open();

        this._standardEnabled = SceneManager.StandardRenderingPipeline !== null;
        standardPipeline.add(this, '_standardEnabled').name('Enable').onChange(async r => {
            const pipeline = new StandardRenderingPipeline('Standard', scene, 1.0, null, scene.cameras);
            
            await Tools.CreateFileFromURL('assets/textures/lensflaredirt.png');
            pipeline.lensTexture = pipeline.lensFlareDirtTexture = new Texture('file:lensflaredirt.png', scene);

            await Tools.CreateFileFromURL('assets/textures/lensstar.png');
            pipeline.lensStarTexture = new Texture('file:lensstar.png', scene);

            await Tools.CreateFileFromURL('assets/textures/lenscolor.png');
            pipeline.lensColorTexture = new Texture('file:lenscolor.png', scene);

            SceneManager.StandardRenderingPipeline = pipeline;
            this.update(scene);
        });

        if (this._standardEnabled) {
            const bloom = standardPipeline.addFolder('Bloom');
            bloom.open();
            bloom.add(SceneManager.StandardRenderingPipeline, 'BloomEnabled').name('Bloom Enabled');
            bloom.add(SceneManager.StandardRenderingPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
            bloom.add(SceneManager.StandardRenderingPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
            bloom.add(SceneManager.StandardRenderingPipeline, "blurWidth").min(0).max(512).step(0.01).name("Blur Width");
            bloom.add(SceneManager.StandardRenderingPipeline, "horizontalBlur").name("Horizontal Blur");

            const motionBlur = standardPipeline.addFolder('Motion Blur');
            motionBlur.open();
            motionBlur.add(SceneManager.StandardRenderingPipeline, 'MotionBlurEnabled').name('Motion Blur Enabled');
            motionBlur.add(SceneManager.StandardRenderingPipeline, "motionBlurSamples").min(1).max(64).step(1).name("Samples Count");
            motionBlur.add(SceneManager.StandardRenderingPipeline, "motionStrength").min(0).step(0.01).name("Strength");

            const lensFlare = standardPipeline.addFolder('Lens Flare');
            lensFlare.open();
            lensFlare.add(SceneManager.StandardRenderingPipeline, "LensFlareEnabled").name("Lens Flare Enabled");
            lensFlare.add(SceneManager.StandardRenderingPipeline, "lensFlareStrength").min(0).max(100).step(0.01).name("Strength");
            lensFlare.add(SceneManager.StandardRenderingPipeline, "lensFlareHaloWidth").min(0).max(2).step(0.01).name("Halo Width");
            lensFlare.add(SceneManager.StandardRenderingPipeline, "lensFlareGhostDispersal").min(0).max(10).step(0.1).name("Ghost Dispersal");
            lensFlare.add(SceneManager.StandardRenderingPipeline, "lensFlareDistortionStrength").min(0).max(500).step(0.1).name("Distortion Strength");

            const dof = standardPipeline.addFolder('Depth-Of-Field');
            dof.open();
            dof.add(SceneManager.StandardRenderingPipeline, "DepthOfFieldEnabled").name("Depth-Of-Field Enabled");
            dof.add(SceneManager.StandardRenderingPipeline, "depthOfFieldDistance").min(0).max(1).step(0.01).name("DOF Distance");
            dof.add(SceneManager.StandardRenderingPipeline, "depthOfFieldBlurWidth").min(0).max(512).name("Blur Width");

            const hdr = standardPipeline.addFolder('HDR');
            hdr.open();
            hdr.add(SceneManager.StandardRenderingPipeline, "HDREnabled").name("HDR Enabled");
            hdr.add(SceneManager.StandardRenderingPipeline, "hdrMinimumLuminance").min(0).max(2).name("Minimum Luminance");
            hdr.add(SceneManager.StandardRenderingPipeline, "hdrDecreaseRate").min(0).max(2).name("Decrease Rate");
            hdr.add(SceneManager.StandardRenderingPipeline, "hdrIncreaseRate").min(0).max(2).name("Increase Rate");

            const vls = standardPipeline.addFolder('Volumetric Lights');
            vls.open();
            vls.add(SceneManager.StandardRenderingPipeline, "VLSEnabled").name("Volumetric Lights Enabled").onChange(r => {
                const picker = new Picker('Select Light Emitter');
                picker.addItems(scene.lights.map(l => (l instanceof SpotLight || l instanceof DirectionalLight) && l));
                picker.open((items) => {
                    if (items.length > 0)
                        SceneManager.StandardRenderingPipeline.sourceLight = <SpotLight | DirectionalLight> scene.getLightByName(items[0].name);
                    
                    this.update(scene);
                });
            });
            if (SceneManager.StandardRenderingPipeline.VLSEnabled) {
                vls.add(SceneManager.StandardRenderingPipeline, "volumetricLightCoefficient").min(0).max(1).step(0.01).name("Scattering Coefficient");
                vls.add(SceneManager.StandardRenderingPipeline, "volumetricLightPower").min(0).max(10).step(0.01).name("Scattering Power");
                vls.add(SceneManager.StandardRenderingPipeline, "volumetricLightBlurScale").min(0).max(64).step(1).name("Blur scale");
                vls.add(SceneManager.StandardRenderingPipeline, "volumetricLightStepsCount").min(0).max(100).step(1).name("Steps count");
            }
        }
    }
}
