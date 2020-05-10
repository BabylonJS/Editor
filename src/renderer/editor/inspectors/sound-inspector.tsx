import { Sound } from "babylonjs";

import { Inspector } from "../components/inspector";
import { AbstractInspector } from "./abstract-inspector";

export class SoundInspector extends AbstractInspector<Sound> {
    private _volume: number = 0;
    private _playbackRate: number = 0;
    private _rolloffFactor: number = 0;

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
     * Adds all editable functions.
     */
    protected addFunctions(): void {
        this.tool!.addButton("Play").onClick(() => !this.selectedObject.isPlaying && this.selectedObject.play());
        this.tool!.addButton("Stop").onClick(() => this.selectedObject.isPlaying && this.selectedObject.stop());
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
}

Inspector.registerObjectInspector({
    ctor: SoundInspector,
    ctorNames: ["Sound"],
    title: "Sound",
});
