module BABYLON.EDITOR {
    export class AudioTool extends AbstractDatTool {
        // Public members
        public tab: string = "SOUND.TAB";

        // Private members
        private _volume: number;
        private _playbackRate: number;
        private _position: Vector3;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-SOUND"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Sound)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Sound" });
        }

        // Update
        public update(): boolean {
            var sound: Sound = this.object = this._editionTool.object;
            var soundTrack = this._editionTool.core.currentScene.soundTracks[sound.soundTrackId];

            super.update();

            if (!sound)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(sound);

            // Sound
            var soundFolder = this._element.addFolder("Sound");
            soundFolder.add(this, "_playSound").name("Play Sound");
            soundFolder.add(this, "_pauseSound").name("Pause Sound");
            soundFolder.add(this, "_stopSound").name("Stop Sound");

            this._volume = sound.getVolume();
            this._playbackRate = (<any>sound)._playbackRate;

            soundFolder.add(this, "_volume").min(0.0).max(1.0).step(0.01).name("Volume").onChange((result: any) => {
                sound.setVolume(result);
            });
            soundFolder.add(this, "_playbackRate").min(0.0).max(1.0).step(0.01).name("Playback Rate").onChange((result: any) => {
                sound.setPlaybackRate(result);
            });
            soundFolder.add(sound, "rolloffFactor").min(0.0).max(1.0).step(0.01).name("Rolloff Factor").onChange((result: any) => {
                sound.updateOptions({
                    rolloffFactor: result
                });
            });
            soundFolder.add(sound, "loop").name("Loop").onChange((result: any) => {
                sound.updateOptions({
                    loop: result
                });
            });
            soundFolder.add(sound, "distanceModel", ["linear", "exponential", "inverse"]).name("Distance Model").onFinishChange((result: any) => {
                sound.updateOptions({
                    distanceModel: result
                });
            });

            if (sound.spatialSound) {
                soundFolder.add(sound, "maxDistance").min(0.0).name("Max Distance").onChange((result: any) => {
                    sound.updateOptions({
                        maxDistance: result
                    });
                });
            }

            sound.distanceModel

            this._position = (<any>sound)._position;
            var positionFolder = soundFolder.addFolder("Position");
            positionFolder.open();
            positionFolder.add(this._position, "x").step(0.1).onChange(this._positionCallback(sound)).listen();
            positionFolder.add(this._position, "y").step(0.1).onChange(this._positionCallback(sound)).listen();
            positionFolder.add(this._position, "z").step(0.1).onChange(this._positionCallback(sound)).listen();

            // Soundtrack
            var soundTrackFolder = this._element.addFolder("Sound Track");

            return true;
        }

        // Position callback
        private _positionCallback(sound: Sound): (result: any) => void {
            return (result: any) => {
                sound.setPosition(this._position);
            }
        }

        // Pause sound
        private _pauseSound(): void {
            var sound: Sound = this.object;
            sound.pause();
        }

        // Play sound
        private _playSound(): void {
            var sound: Sound = this.object;
            sound.play();
        }

        // Stop sound
        private _stopSound(): void {
            var sound: Sound = this.object;
            sound.stop();
        }
    }
}