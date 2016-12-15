var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Exporter = (function () {
            /**
            * Constructor
            */
            function Exporter(core) {
                // private members
                this._window = null;
                this._editor = null;
                this._editorID = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";
                this._generatedCode = "";
                // Initialize
                this.core = core;
            }
            // Opens the scene exporter
            Exporter.prototype.openSceneExporter = function (babylonScene) {
                var _this = this;
                // Create window
                var windowBody = EDITOR.GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");
                this._window = new EDITOR.GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    _this._editor.resize();
                };
                // Create ace editor
                this._editor = ace.edit(this._editorID);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Finish
                this._generatedCode = this.generateCode(babylonScene);
            };
            // Generates the code
            Exporter.prototype.generateCode = function (babylonScene) {
                var scene = this.core.currentScene;
                var finalString = "";
                if (babylonScene) {
                    var obj = BABYLON.SceneSerializer.Serialize(this.core.currentScene);
                    finalString = JSON.stringify(obj, null, "\t");
                }
                else {
                    finalString = EDITOR.ProjectExporter.ExportProject(this.core, true);
                }
                if (this._editor) {
                    this._editor.setValue(finalString, -1);
                    if (!babylonScene)
                        this._editor.getSession().setUseWrapMode(false);
                }
                return finalString;
            };
            Exporter.prototype._exportParticleSystem = function (particleSystem) {
                var node = particleSystem.emitter;
                var finalString = "";
                if (!node.geometry)
                    finalString = "\tnode = new BABYLON.Mesh(\"" + node.name + "\", scene, null, null, true);\n";
                else
                    finalString = "\tnode = scene.getMeshByName(\"" + node.name + "\");\n";
                finalString += "\tparticleSystem = new BABYLON.ParticleSystem(\"" + particleSystem.name + "\", " + particleSystem.getCapacity() + ", scene);\n";
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
                    else if (value instanceof BABYLON.Vector3) {
                        result = this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Texture) {
                        result += "BABYLON.Texture.CreateFromBase64String(\"" + value["_buffer"] + "\", \"" + value.name + "\", scene)";
                    }
                    else
                        continue;
                    finalString += "\tparticleSystem." + thing + " = " + result + ";\n";
                }
                finalString += "\tnode.attachedParticleSystem = particleSystem;\n";
                if (!particleSystem._stopped)
                    finalString += "\tparticleSystem.start();\n";
                return finalString;
            };
            // Exports a BABYLON.Vector3
            Exporter.prototype._exportVector3 = function (vector) {
                return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
            };
            // Exports a BABYLON.Color3
            Exporter.prototype._exportColor3 = function (color) {
                return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
            };
            // Exports a BABYLON.Color4
            Exporter.prototype._exportColor4 = function (color) {
                return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
            };
            return Exporter;
        }());
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.exporter.js.map
