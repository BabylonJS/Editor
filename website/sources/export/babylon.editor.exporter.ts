module BABYLON.EDITOR {
    export class Exporter {
        // public members
        public core: EditorCore;

        // private members
        private _window: GUI.GUIWindow = null;
        private _editor: AceAjax.Editor = null;

        private _editorID: string = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";

        private _generatedCode: string = "";

        /**
        * Constructor
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
        }

        // Opens the scene exporter
        public openSceneExporter(babylonScene?: boolean): void {
            // Create window
            var windowBody = GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");

            this._window = new GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
            this._window.buildElement(null);

            this._window.onToggle = (maximized: boolean, width: number, height: number) => {
                this._editor.resize();
            };

            // Create ace editor
            this._editor = ace.edit(this._editorID);
            this._editor.setTheme("ace/theme/clouds");
            this._editor.getSession().setMode("ace/mode/javascript");

            // Finish
            this._generatedCode = this.generateCode(babylonScene);
        }

        // Generates the code
        public generateCode(babylonScene?: boolean): string {
            var scene = this.core.currentScene;
            var finalString = "";

            if (babylonScene) {
                var obj = BABYLON.SceneSerializer.Serialize(this.core.currentScene);
                finalString = JSON.stringify(obj, null, "\t");
            }
            else {
                finalString = ProjectExporter.ExportProject(this.core, true);
            }

            if (this._editor) {
                this._editor.setValue(finalString, -1);

                if (!babylonScene)
                    this._editor.getSession().setUseWrapMode(false);
            }

            return finalString;
        }

        public _exportParticleSystem(particleSystem: ParticleSystem): string {
            var node = <Mesh> particleSystem.emitter;

            var finalString = "";

            if (!node.geometry)
                finalString = "\tnode = new BABYLON.Mesh(\"" + node.name + "\", scene, null, null, true);\n";
            else
                finalString = "\tnode = scene.getMeshByName(\"" + node.name + "\");\n";

            finalString += "\tparticleSystem = new BABYLON.ParticleSystem(\"" + particleSystem.name + "\", " + particleSystem.getCapacity() + ", scene);\n"
            finalString += "\tparticleSystem.emitter = node;\n";

            for (var thing in particleSystem) {
                if (thing[0] === "_")
                    continue;

                var value = particleSystem[thing];
                var result = "";
                
                if (typeof value === "number" || typeof value === "boolean") {
                    result += value;
                }
                else if (typeof value === "string") {
                    result += "\"" + value + "\"";
                }
                else if (value instanceof Vector3) {
                    result = this._exportVector3(value);
                }
                else if (value instanceof Color4) {
                    result += this._exportColor4(value);
                }
                else if (value instanceof Color3) {
                    result += this._exportColor3(value);
                }
                else if (value instanceof Texture) {
                    result += "BABYLON.Texture.CreateFromBase64String(\"" + value["_buffer"] + "\", \"" + value.name + "\", scene)";
                }
                else
                    continue;

                finalString += "\tparticleSystem." + thing + " = " + result + ";\n";
            }

            finalString += "\tnode.attachedParticleSystem = particleSystem;\n";

            if (!(<any>particleSystem)._stopped)
                finalString += "\tparticleSystem.start();\n";

            return finalString;
        }
        
        // Exports a BABYLON.Vector3
        public _exportVector3(vector: Vector3): string {
            return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
        }

        // Exports a BABYLON.Color3
        public _exportColor3(color: Color3): string {
            return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
        }

        // Exports a BABYLON.Color4
        public _exportColor4(color: Color4): string {
            return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
        }
    }
}