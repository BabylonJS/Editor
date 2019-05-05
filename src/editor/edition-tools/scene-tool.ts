import { Scene, Vector3, CannonJSPlugin, GlowLayer, HighlightLayer } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';
import SceneManager from '../scene/scene-manager';

export default class SceneTool extends AbstractEditionTool<Scene> {
    // Public members
    public divId: string = 'SCENE-TOOL';
    public tabName: string = 'Properties';

    // Private members
    private _physicsEnabled: boolean = false;
    private _fogMode: string = '';
    private _glowEnabled: boolean = false;
    private _hightlightEnabled: boolean = false;

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

        // Misc.
        this._physicsEnabled = scene.isPhysicsEnabled();
        this._glowEnabled = SceneManager.GlowLayer !== null;
        this._hightlightEnabled = SceneManager.HighLightLayer !== null;
        
        // Colors
        const colors = this.tool.addFolder('Colors');
        colors.open();

        this.tool.addColor(colors, 'Ambient', scene.ambientColor).open();
        this.tool.addColor(colors, 'Clear', scene.clearColor).open();

        // Image processing
        const imageProcessing = this.tool.addFolder('Image Processing');
        imageProcessing.open();

        imageProcessing.add(scene.imageProcessingConfiguration, 'exposure').step(0.01).name('Exposure');
        imageProcessing.add(scene.imageProcessingConfiguration, 'contrast').step(0.01).name('Contrast');
        imageProcessing.add(scene.imageProcessingConfiguration, 'toneMappingEnabled').name('Tone Mapping Enabled');

        // Glow layer
        const glow = this.tool.addFolder('Glow Layer');
        glow.open();

        glow.add(this, '_glowEnabled').name('Enable Glow Layer').onFinishChange(r => {
            if (!r) {
                SceneManager.GlowLayer.dispose();
                SceneManager.GlowLayer = null;
            }
            else
                SceneManager.GlowLayer = new GlowLayer('GlowLayer', scene);

            this.update(scene);
        });

        if (this._glowEnabled) {
            glow.add(SceneManager.GlowLayer, 'intensity').min(0).step(0.01).name('Intensity');
            glow.add(SceneManager.GlowLayer, 'blurKernelSize').min(0).max(512).step(1).name('Blur Size').onChange(r => {
                SceneManager.GlowLayer['_options'].blurKernelSize = r * 2;
            });
        }

        // Highlight
        const highlight = this.tool.addFolder('HighLight');
        highlight.open();

        highlight.add(this, '_hightlightEnabled').name('Enable HightLight Layer').onFinishChange(r => {
            if (!r) {
                SceneManager.HighLightLayer.dispose();
                SceneManager.HighLightLayer = null;
            }
            else
                SceneManager.HighLightLayer = new HighlightLayer('HightLight Layer', scene);

            this.update(scene);
        });

        if (this._hightlightEnabled) {
            highlight.add(SceneManager.HighLightLayer, 'blurHorizontalSize').min(0).max(128).step(1).name('Horizontal Blur Size');
            highlight.add(SceneManager.HighLightLayer, 'blurVerticalSize').min(0).max(128).step(1).name('Horizontal Blur Size');
            highlight.add(SceneManager.HighLightLayer, 'innerGlow').name('Inner Glow');
            highlight.add(SceneManager.HighLightLayer, 'outerGlow').name('Outer Glow');
            this.tool.addColor(highlight, 'Neutral Color', SceneManager.HighLightLayer.neutralColor).open();
        }

        // Environment texture
        const environment = this.tool.addFolder('Environment Texture');
        environment.open();
        this.tool.addTexture(environment, this.editor, 'environmentTexture', scene, true, true).name('Environment Texture');

        // Collisions
        const collisions = this.tool.addFolder('Collisions');
        collisions.open();

        collisions.add(scene, 'collisionsEnabled').name('Collisions Enabled');
        this.tool.addVector(collisions, 'Gravity', scene.gravity, () => {
            const physics = scene.getPhysicsEngine();
            if (physics)
                physics.setGravity(scene.gravity.clone());
        });

        // Physics
        const physics = this.tool.addFolder('Physics');
        physics.open();

        physics.add(this, '_physicsEnabled').name('Physics Enabled').onFinishChange(async r => {
            if (r) {
                this.editor.layout.lockPanel('main', 'Enabling Physics...', true);
                await Tools.ImportScript('cannon');
                scene.enablePhysics(scene.gravity.clone(), new CannonJSPlugin(true));
                scene.getPhysicsEngine().setTimeStep(0);
                this.editor.layout.unlockPanel('main');
            }
            else
                scene.disablePhysicsEngine();
        });

        // Audio
        const audio = this.tool.addFolder('Audio');
        audio.open();

        audio.add(scene, 'audioEnabled').name('Enable Audio');

        // Fog
        const fog = this.tool.addFolder('Fog');
        fog.open();

        fog.add(scene, 'fogEnabled').name('Enable Fog');
        fog.add(scene, 'fogStart').name('Fog Start');
        fog.add(scene, 'fogEnd').name('Fog End');
        fog.add(scene, 'fogDensity').name('Fog Density');

        const fogModes = ['FOGMODE_NONE', 'FOGMODE_LINEAR', 'FOGMODE_EXP', 'FOGMODE_EXP2'];
        this._fogMode = fogModes[0];

        for (const mode of fogModes) {
            if (scene.fogMode === Scene[mode]) {
                this._fogMode = mode;
                break;
            }
        }

        fog.add(this, '_fogMode', fogModes).name('Fog Mode').onFinishChange(r => {
            scene.fogMode = Scene[r];
        });

        this.tool.addColor(fog, 'Color', scene.fogColor).open();
    }
}
