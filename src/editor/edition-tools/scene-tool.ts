import { Scene, Vector3, CannonJSPlugin } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class SceneTool extends AbstractEditionTool<Scene> {
    // Public members
    public divId: string = 'SCENE-TOOL';
    public tabName: string = 'Scene';

    // Private members
    private _physicsEnabled: boolean = false;
    public _fogMode: string = '';

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

        // Colors
        const colors = this.tool.addFolder('Colors');
        colors.open();

        this.tool.addColor(colors, 'Ambient', scene.ambientColor).open();
        this.tool.addColor(colors, 'Clear', scene.clearColor).open();

        // Image processing
        scene.imageProcessingConfiguration.exposure;
        scene.imageProcessingConfiguration.contrast;
        scene.imageProcessingConfiguration.toneMappingEnabled;

        const imageProcessing = this.tool.addFolder('Image Processing');
        imageProcessing.open();

        imageProcessing.add(scene.imageProcessingConfiguration, 'exposure').step(0.01).name('Exposure');
        imageProcessing.add(scene.imageProcessingConfiguration, 'contrast').step(0.01).name('Contrast');
        imageProcessing.add(scene.imageProcessingConfiguration, 'toneMappingEnabled').name('Tone Mapping Enabled');

        // Collisions
        const collisions = this.tool.addFolder('Collisions');
        collisions.open();

        collisions.add(scene, 'collisionsEnabled').name('Collisions Enabled');
        this.tool.addVector(collisions, 'Gravity', scene.gravity);

        // Physics
        const physics = this.tool.addFolder('Physics');
        physics.open();

        physics.add(this, '_physicsEnabled').name('Physics Enabled').onFinishChange(async r => {
            if (r) {
                this.core.layout.lockPanel('left', 'Enabling...', true);
                const cannonjs = await Tools.ImportScript('cannonjs');
                scene.enablePhysics(new Vector3(0, -0.91, 0), new CannonJSPlugin(true));
                this.core.layout.unlockPanel('left');
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
    }
}
