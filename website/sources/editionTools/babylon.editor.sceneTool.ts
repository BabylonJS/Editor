module BABYLON.EDITOR {
    export class SceneTool extends AbstractDatTool {
        // Public members
        public tab: string = "SCENE.TAB";

        // Private members
        private _fogType: string = "";

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
        public update(): boolean {
            var object: Scene = this.object = this._editionTool.object;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Common
            this._element.add(SceneFactory, "AnimationSpeed").min(0.0).name("Animation Speed");

            // Colors
            var colorsFolder = this._element.addFolder("Colors");

            var ambientColorFolder = colorsFolder.addFolder("Ambient Color");
            ambientColorFolder.open();
            ambientColorFolder.add(object.ambientColor, "r").min(0.0).max(1.0).step(0.01);
            ambientColorFolder.add(object.ambientColor, "g").min(0.0).max(1.0).step(0.01);
            ambientColorFolder.add(object.ambientColor, "b").min(0.0).max(1.0).step(0.01);

            var clearColorFolder = colorsFolder.addFolder("Clear Color");
            clearColorFolder.open();
            clearColorFolder.add(object.clearColor, "r").min(0.0).max(1.0).step(0.01);
            clearColorFolder.add(object.clearColor, "g").min(0.0).max(1.0).step(0.01);
            clearColorFolder.add(object.clearColor, "b").min(0.0).max(1.0).step(0.01);

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
            
            var fogTypes = [
                 "None",
                "Exp", "Exp2",
                "Linear" 
            ];
            switch (object.fogMode) {
                case Scene.FOGMODE_EXP: this._fogType = "Exp"; break;
                case Scene.FOGMODE_EXP2: this._fogType = "Exp2"; break;
                case Scene.FOGMODE_LINEAR: this._fogType = "Linear"; break;
                default: this._fogType = "None"; break;
            }
            
            fogFolder.add(this, "_fogType", fogTypes).name("Fog Mode").onFinishChange((result: any) => {
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
            capacitiesFolder.close();
            capacitiesFolder.add(object, "postProcessesEnabled").name("Post-Processes Enabled");
            capacitiesFolder.add(object, "shadowsEnabled").name("Shadows Enabled");
            capacitiesFolder.add(object, "fogEnabled").name("Fog Enabled");
            capacitiesFolder.add(object, "lensFlaresEnabled").name("Lens Flares Enabled");
            capacitiesFolder.add(object, "lightsEnabled").name("Lights Enabled");
            capacitiesFolder.add(object, "particlesEnabled").name("Particles Enabled");
            capacitiesFolder.add(object, "probesEnabled").name("Reflection Probes Enabled");
            capacitiesFolder.add(object, "proceduralTexturesEnabled").name("Procedural Textures Enabled");
            capacitiesFolder.add(object, "renderTargetsEnabled").name("Render Targets Enabled");
            capacitiesFolder.add(object, "texturesEnabled").name("Textures Enabled");
            capacitiesFolder.add(object, "skeletonsEnabled").name("Skeletons Enabled");

            return true;
        }
    }
}