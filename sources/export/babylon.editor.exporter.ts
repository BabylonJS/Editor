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
        public openSceneExporter(): void {
            // Create window
            var windowBody = GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");

            this._window = new GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
            this._window.buttons = ["Generate", "Cancel"];
            this._window.buildElement(null);

            // Create ace editor
            this._editor = ace.edit(this._editorID);
            this._editor.setTheme("ace/theme/clouds");
            this._editor.getSession().setMode("ace/mode/javascript");

            // Finish
            this._generatedCode = this._generateCode();
        }

        // Generates the code
        private _generateCode(): string {
            var scene = this.core.currentScene;
            var finalString = [
                "function CreateBabylonScene(scene) {",
                "\tvar engine = scene.getEngine();",
                "\tvar node = null;\n",
                this._traverseNodes(),
                "}\n"
            ].join("\n");

            this._editor.setValue(finalString, -1);

            return finalString;
        }

        // Export node's transformation
        private _exportNodeTransform(node: any): string {
            var finalString = "";

            if (node.position) {
                finalString += "\tnode.position = " + this._exportVector3(node.position) + ";\n";
            }

            if (node.rotation) {
                finalString += "\tnode.rotation = " + this._exportVector3(node.rotation) + ";\n";
            }

            if (node.rotationQuaternion) {
                finalString += "\tnode.rotationQuaternion = " + this._exportQuaternion(node.rotationQuaternion) + ";\n";
            }

            if (node.scaling) {
                finalString += "\tnode.scaling = " + this._exportVector3(node.scaling) + ";\n";
            }

            return finalString;
        }

        // Export node's material
        private _exportNodeMaterial(node: AbstractMesh): string {
            var finalString = "\n";
            var material = node.material;

            if (!material)
                return finalString;

            // Set constructor
            if (material instanceof StandardMaterial) {
                finalString += "\tnode.material = new BABYLON.StandardMaterial(\"" + material.name + "\", scene);\n";
            }
            else if (material instanceof PBRMaterial) {
                finalString += "\tnode.material = new BABYLON.PBRMaterial(\"" + material.name + "\", scene);\n";
            }

            // Set values
            for (var thing in material) {
                var value = material[thing];
                var result = "";

                if (typeof value === "number" && thing[0] !== "_") {
                    result += value;
                }
                else if (value instanceof Vector3) {
                    result += this._exportVector3(value);
                }
                else if (value instanceof Vector2) {
                    result += this._exportVector2(value);
                }
                else if (value instanceof Color3) {
                    result += this._exportColor3(value);
                }
                else if (value instanceof Color4) {
                    result += this._exportColor4(value);
                }
                else if (value instanceof BaseTexture) {
                    // TODO
                }
                else
                    continue;

                finalString += "\tnode.material." + thing + " = " + result + ";\n";
            }

            return finalString + "\n";
        }

        // Exports a BABYLON.Vector2
        private _exportVector2(vector: Vector2): string {
            return "new BABYLON.Vector2(" + vector.x + ", " + vector.y + ")";
        }

        // Exports a BABYLON.Vector3
        private _exportVector3(vector: Vector3): string {
            return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
        }

        // Exports a BABYLON.Quaternion
        private _exportQuaternion(quaternion: Quaternion): string {
            return "new BABYLON.Quaternion(" + quaternion.x + ", " + quaternion.y + ", " + quaternion.z + ", " + quaternion.w + ")";
        }

        // Exports a BABYLON.Color3
        private _exportColor3(color: Color3): string {
            return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
        }

        // Exports a BABYLON.Color4
        private _exportColor4(color: Color4): string {
            return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
        }

        // Traverses nodes
        private _traverseNodes(node?: Node): string {
            var scene = this.core.currentScene;

            if (!node) {
                var rootNodes: Node[] = [];
                var finalString = "";

                this._fillRootNodes(rootNodes, "meshes");

                for (var i = 0; i < rootNodes.length; i++) {
                    finalString += this._traverseNodes(rootNodes[i]);
                }

                return finalString;
            }
            else {
                var finalString = "\t// Configure node " + node.name + "\n";
                finalString += "\tnode = scene.getNodeByName(\"" + node.name + "\");\n";

                // TODO: Check if node exists.
                // If not, export geometry and see performances

                // Transformation
                finalString += this._exportNodeTransform(node);

                if (node instanceof AbstractMesh) {
                    // Material
                    finalString += this._exportNodeMaterial(node);
                }

                for (var i = 0; i < node.getDescendants().length; i++) {
                    finalString += this._traverseNodes(node.getDescendants()[i]);
                }

                return finalString;
            }

            // Should never happen
            return "";
        }

        // Fills array of root nodes
        private _fillRootNodes(data: Node[], propertyPath: string): void {
            var scene = this.core.currentScene;
            var nodes: Node[] = scene[propertyPath];

            for (var i = 0; i < nodes.length; i++) {
                if (!nodes[i].parent)
                    data.push(nodes[i]);
            }
        }
    }
}