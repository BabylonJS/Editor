module BABYLON.EDITOR {
    export class MaterialTool extends AbstractTool {
        // Public members
        public object: Node = null;

        public tab: string = "MATERIAL.TAB";

        // Private members
        private _element: GUI.GUIEditForm;

        private _forbiddenElements: Array<string>;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
            ];

            this._forbiddenElements = [
                "pointSize",
                "sideOrientation",
                "alphaMode",
                "zOffset",
                "fillMode",

                // PBR
                "overloadedAmbientIntensity",
                "overloadedDiffuseIntensity",
                "overloadedSpecularIntensity",
                "overloadedEmissiveIntensity",
                "overloadedAmbient",
                "overloadedDiffuse",
                "overloadedSpecular",
                "overloadedEmissive",
                "overloadedReflection",
                "overloadedGlossiness",
                "overloadedGlossinessIntensity",
                "overloadedReflectionIntensity",
                "overloadedShadowIntensity",
                "overloadedShadeIntensity",
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh) {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
        }

        // Update
        public update(): void {
            var object: any = this._editionTool.object.material;

            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            if (!object || !(object instanceof Material))
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);

            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name");

            var propertiesFolder = this._element.addFolder("Properties");
            this._addNumberFields(propertiesFolder, object);

            var colorsFolder = this._element.addFolder("Colors");
            this._addColorFields(colorsFolder, object);
        }

        // Resize
        public resize(): void {
            this._element.width = this._editionTool.panel.width - 15;
        }

        // Adds a number
        private _addNumberFields(folder: dat.IFolderElement, object: any): void {
            for (var thing in object) {
                var value = object[thing];
                if (typeof value === "number" && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                    folder.add(object, thing).name(thing).step(0.01);
                }
            }
        }

        // Adds colors
        private _addColorFields(folder: dat.IFolderElement, object: any): void {
            for (var thing in object) {
                var value = object[thing];
                if (value instanceof Color3 && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                    var colorFolder = this._element.addFolder(thing, folder);
                    colorFolder.close();
                    colorFolder.add(object[thing], "r").name("r").min(0.0).max(1.0).step(0.001);
                    colorFolder.add(object[thing], "g").name("g").min(0.0).max(1.0).step(0.001);
                    colorFolder.add(object[thing], "b").name("b").min(0.0).max(1.0).step(0.001);
                }
            }
        }
    }
}