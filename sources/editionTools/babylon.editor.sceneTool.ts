module BABYLON.EDITOR {
    export class SceneTool extends AbstractTool {
        // Public members
        public scene: Scene = null;

        public tab: string = "SCENE.TAB";

        // Private members
        private _element: GUI.GUIEditForm;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-SCENE"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Scene)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Scene" });
        }

        // Update
        public update(): void {
            var object: Scene = this.object = this._editionTool.object;

            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Colors
            var colorsFolder = this._element.addFolder("Colors");

            var ambientColorFolder = colorsFolder.addFolder("Ambient Color");
            ambientColorFolder.add(object.ambientColor, "r").min(0.0).max(1.0).step(0.001);
            ambientColorFolder.add(object.ambientColor, "g").min(0.0).max(1.0).step(0.001);
            ambientColorFolder.add(object.ambientColor, "b").min(0.0).max(1.0).step(0.001);

            var clearColorFolder = colorsFolder.addFolder("Clear Color");
            clearColorFolder.add(object.clearColor, "r").min(0.0).max(1.0).step(0.001);
            clearColorFolder.add(object.clearColor, "g").min(0.0).max(1.0).step(0.001);
            clearColorFolder.add(object.clearColor, "b").min(0.0).max(1.0).step(0.001);

            // Collisions
            var collisionsFolder = this._element.addFolder("Collisions");
            collisionsFolder.add(object, "collisionsEnabled").name("Collisions Enabled");

            var gravityFolder = collisionsFolder.addFolder("Gravity");
            gravityFolder.add(object.gravity, "x");
            gravityFolder.add(object.gravity, "y");
            gravityFolder.add(object.gravity, "z");

            // Audio
            var audioFolder = this._element.addFolder("Audio");
            audioFolder.add(object, "audioEnabled").name("Audio Enabled");

            // Fog
            var fogFolder = this._element.addFolder("Fog");
            fogFolder.add(object, "fogMode", [
                "None",
                "Exp",
                "Exp2",
                "Linear"
            ]).name("Fog Mode").onFinishChange((result: any) => {
                switch (result) {
                    case "Exp": object.fogMode = Scene.FOGMODE_EXP; break;
                    case "Exp2": object.fogMode = Scene.FOGMODE_EXP2; break;
                    case "Linear": object.fogMode = Scene.FOGMODE_LINEAR; break;
                    default: object.fogMode = Scene.FOGMODE_NONE; break;
                }
            });
            fogFolder.add(object, "fogEnabled").name("Enable Fog");
            fogFolder.add(object, "fogStart").name("Fog Start").min(0.0);
            fogFolder.add(object, "fogEnd").name("Fog End").min(0.0);
            fogFolder.add(object, "fogDensity").name("Fog Density").min(0.0);

            var fogColorFolder = fogFolder.addFolder("Fog Color");
            fogColorFolder.add(object.fogColor, "r").min(0.0).max(1.0).step(0.001);
            fogColorFolder.add(object.fogColor, "g").min(0.0).max(1.0).step(0.001);
            fogColorFolder.add(object.fogColor, "b").min(0.0).max(1.0).step(0.001);

            // Capacities
            var capacitiesFolder = this._element.addFolder("Capacities");


            /*
            object.audioEnabled;
            object.collisionsEnabled;
            object.gravity;
            object.headphone;
            */

            // Capacities
        }

        // Resize
        public resize(): void {
            this._element.width = this._editionTool.panel.width - 15;
        }
    }
}