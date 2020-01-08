import { Sound, Vector3, Tags } from 'babylonjs';

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
    private _time: number = 0;

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

        // Reset
        if (sound['metadata'] && sound['metadata'].original)
            this.tool.add(this, 'resetToOriginal').name('Reset to original');

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

        // Player
        const player = this.tool.addFolder('Player');
        player.open();

        this._time = 0;

        const buffer = this.object.getAudioBuffer();
        if (buffer) {
            player.add(this, '_time').min(0).max(buffer.duration).name('Time (seconds)').onChange(r => {
                this.object.stop();
                this.object.play(0, this._time);
            });
        }

        // Spatial
        const spatial = this.tool.addFolder('Spatial');
        spatial.open();

        if (sound.spatialSound) {
            spatial.add(sound, 'distanceModel', ['linear', 'exponential', 'inverse']).name('Distance Model').onFinishChange((result: string) => sound.updateOptions({ distanceModel: result }));
            spatial.add(sound, 'maxDistance').min(0.0).name('Max Distance').onChange((result: number) => sound.updateOptions({ maxDistance: result }));

            this._position = sound['_position'];
            this.tool.addVector(spatial, 'Position', this._position, () => sound.setPosition(this._position)).open();
        }

        spatial.add(this, '_attachToMesh').name('Attach to mesh...');
    }

    /**
     * Resets the current sound to the original one
     */
    protected resetToOriginal (): void {
        const m = this.object['metadata'].original;
        
        // Common
        this.object.loop = m.loop;
        this.object.setVolume(m.volume);
        this.object.rolloffFactor = m.rolloffFactor;
        this.object.setPlaybackRate(m.playbackRate);
        this.object.spatialSound = m.spatialSound;

        // Spatial
        if (!m.connectedMeshId) {
            this.object.detachFromMesh();
            this.object.setPosition(Vector3.Zero());
            this.editor.graph.setParent(this.object['id'], this.editor.graph.root);
        } else {
            const mesh = this.editor.core.scene.getMeshByID(m.connectedMeshId);
            if (mesh) {
                this.object.attachToMesh(mesh);
                this.object.setPosition(Vector3.FromArray(m.position));
                this.editor.graph.setParent(this.object['id'], mesh.id);
            }
        }

        // Update
        setTimeout(() => {
            Tags.RemoveTagsFrom(this.object, 'modified');
            this.editor.graph.updateObjectMark(this.object);
        }, 1);

        this.editor.inspector.updateDisplay();
        this.update(this.object);
    }

    // Pause sound
    private _pauseSound (): void {
        this.object.pause();
    }

    // Play sound
    private _playSound (): void {
        if (!this.object.isPlaying)
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
                this.editor.graph.setParent(this.object['id'], this.editor.graph.root);
            }
            else {
                const mesh = this.editor.core.scene.meshes[items[0].id];

                if (mesh) {
                    this.object.attachToMesh(mesh);
                    this.editor.graph.setParent(this.object['id'], mesh.id);
                }
            }

            this.update(this.object);
        });
    }
}
