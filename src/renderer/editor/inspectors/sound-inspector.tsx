import { Nullable } from "../../../shared/types";

import { Sound, Observer } from "babylonjs";

import { SliderController } from "../gui/augmentations/slider";

import { Inspector } from "../components/inspector";
import { AbstractInspector } from "./abstract-inspector";
import { GUI } from "dat.gui";

export class SoundInspector extends AbstractInspector<Sound> {
    private _volume: number = 0;
    private _playbackRate: number = 0;
    private _rolloffFactor: number = 0;

    private _time: number = 0;
    private _updateInterval: Nullable<number> = null;
    private _soundBar: Nullable<SliderController> = null;
    private _endObserver: Nullable<Observer<Sound>> = null;

    /**
     * Called on the component did mount.
     * @override
     */
    public onUpdate(): void {
        this.addFunctions();
        this.addCommon();
        this.addControls();
        this.addSpatial();
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this._clearSoundBar();
    }

    /**
     * Adds all editable functions.
     */
    protected addFunctions(): void {
        const functions = this.tool!.addFolder("Functions");
        functions.open();

        functions.addButton("Play").onClick(() => {
            if (!this.selectedObject.isPlaying) {
                this.selectedObject.play();

                this._endObserver = this.selectedObject.onEndedObservable.add(() => this._removeSoundBar(functions));
                this._addSoundBar(functions);
            }
        });

        functions.addButton("Stop").onClick(() => {
            if (this.selectedObject.isPlaying) {
                this.selectedObject.stop();
                this._removeSoundBar(functions);
            }

        });

        if (this.selectedObject.isPlaying) {
            this._addSoundBar(functions);
        }
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): void {
        const common = this.tool!.addFolder("Common");
        common.open();

        common.add(this.selectedObject, "loop").name("Loop");
        common.add(this.selectedObject, "autoplay").name("Auto Play");
    }

    /**
     * Adds all the editable controls.
     */
    protected addControls(): void {
        const controls = this.tool!.addFolder("Controls");
        controls.open();

        this._volume = this.selectedObject.getVolume();
        this._playbackRate = this.selectedObject["_playbackRate"];
        this._rolloffFactor = this.selectedObject.rolloffFactor;

        controls.addSlider(this, "_volume", 0, 1, 0.01).name("Volume").onChange(() => this.selectedObject.setVolume(this._volume));
        controls.addSlider(this, "_playbackRate", 0, 1, 0.01).name("Playback Rate").onChange(() => this.selectedObject.setPlaybackRate(this._playbackRate));
        controls.addSlider(this, "_rolloffFactor", 0, 1, 0.01).name('Rolloff Factor').onChange(() => this.selectedObject.updateOptions({ rolloffFactor: this._rolloffFactor }));
    }

    /**
     * Adds all the spatial editable properties.
     */
    protected addSpatial(): void {
        if (!this.selectedObject.spatialSound) { return; }

        const spatial = this.tool!.addFolder("Spatial");
        spatial.open();

        spatial.addSuggest(this.selectedObject, "distanceModel", ["linear", "exponential", "inverse"]).name("Distance Model").onChange((r) => this.selectedObject.updateOptions({ distanceModel: r }));
        spatial.add(this.selectedObject, "maxDistance").min(0.001).name("Max Distance").onChange((r) => this.selectedObject.updateOptions({ maxDistance: r }));
    }

    /**
     * Adds the sound bar when the object is playing.
     */
    private _addSoundBar(folder: GUI): void {
        const buffer = this.selectedObject.getAudioBuffer();
        const source = this.selectedObject.getSoundSource();
        if (!buffer || !source) { return; }

        this._time = 1 / (source.context.currentTime || 1);
        this._soundBar = folder.addSlider(this, "_time", 0, 1, 0.01).name("Current Time").onFinishChange(() => {
            this.selectedObject?.stop();
            this.selectedObject?.play(0, this._time * buffer.duration);
        });

        this._updateInterval = setInterval(() => this._soundBar?.setValue(this._time += (1 / buffer.duration) * this.selectedObject["_playbackRate"]), 1000) as any;
    }

    /**
     * Removes the sound bar when the sound is stopped or has ended.
     */
    private _removeSoundBar(folder: GUI): void {
        this._clearSoundBar();

        if (this._soundBar) {
            folder.remove(this._soundBar as any);
            this._soundBar = null;
        }
    }

    /**
     * Clears the sound bar.
     */
    private _clearSoundBar(): void {
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }

        if (this._endObserver) {
            this.selectedObject.onEndedObservable.remove(this._endObserver);
            this._endObserver = null;
        }
    }
}

Inspector.registerObjectInspector({
    ctor: SoundInspector,
    ctorNames: ["Sound"],
    title: "Sound",
});
