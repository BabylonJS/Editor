import { Sound, Vector3 } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';
import Picker from '../gui/picker';

export default class SoundTool extends AbstractEditionTool<Sound> {
    // Public members
    public divId: string = 'SOUND-TOOL';
    public tabName: string = 'Sound';

    // Private members
    private _volume: number = 0;
    private _playbackRate: number = 0;
    private _rolloffFactor: number = 0;
    private _position: Vector3 = Vector3.Zero();

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Sound;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(sound: Sound): void {
        super.update(sound);

        // Common
        const common = this.tool.addFolder('Sound');
        common.open();
        common.add(this, '_playSound').name('Play Sound');
        common.add(this, '_pauseSound').name('Pause Sound');
        common.add(this, '_stopSound').name('Stop Sound');

        this._volume = sound.getVolume();
        this._playbackRate = sound['_playbackRate'];
        this._rolloffFactor = sound.rolloffFactor;

        common.add(this, '_volume').min(0.0).max(1.0).step(0.01).name('Volume').onChange((result: number) => sound.setVolume(result));
        common.add(this, '_playbackRate').min(0.0).max(1.0).step(0.01).name('Playback Rate').onChange((result: number) => sound.setPlaybackRate(result));
        common.add(this, '_rolloffFactor').min(0.0).max(1.0).step(0.01).name('Rolloff Factor').onChange((result: number) => sound.updateOptions({ rolloffFactor: result }));
        common.add(sound, 'loop').name('Loop').onChange((result: boolean) => sound.updateOptions({ loop: result }));

        // Spatial
        if (sound.spatialSound) {
            const spatial = this.tool.addFolder('Spatial');
            spatial.open();

            spatial.add(sound, 'distanceModel', ['linear', 'exponential', 'inverse']).name('Distance Model').onFinishChange((result: string) => sound.updateOptions({ distanceModel: result }));
            spatial.add(sound, 'maxDistance').min(0.0).name('Max Distance').onChange((result: number) => sound.updateOptions({ maxDistance: result }));

            this._position = sound['_position'];
            this.tool.addVector(spatial, 'Position', this._position, () => sound.setPosition(this._position)).open();

            spatial.add(this, '_attachToMesh').name('Attach to mesh...');
        }
    }

    // Pause sound
    private _pauseSound (): void {
        this.object.pause();
    }

    // Play sound
    private _playSound (): void {
        this.object.play();
    }

    // Stop sound
    private _stopSound (): void {
        this.object.stop();
    }

    // Attaches the sound to given mesh
    private _attachToMesh (): void {
        const picker = new Picker('Select mesh to attach');
        picker.addItems(this.editor.core.scene.meshes);

        if (this.object['_connectedMesh'])
            picker.addSelected([this.object['_connectedMesh']]);

        picker.open(items => {
            if (items.length === 0) {
                this.object.detachFromMesh();
                this.editor.graph.setParent(this.object.name, this.editor.graph.root);
            }
            else {
                const mesh = this.editor.core.scene.getMeshByName(items[0].name);

                if (mesh) {
                    this.object.attachToMesh(mesh);
                    this.editor.graph.setParent(this.object.name, mesh.id);
                }
            }
        });
    }
}
