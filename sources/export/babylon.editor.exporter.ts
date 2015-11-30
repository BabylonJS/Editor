module BABYLON.EDITOR {
    export class Exporter {
        // public members
        public core: EditorCore;

        // private members

        /**
        * Constructor
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
        }

        public exportScene(): void {
            var scene = SceneSerializer.Serialize(this.core.currentScene);
            var string = JSON.stringify(scene);


        }
    }
}