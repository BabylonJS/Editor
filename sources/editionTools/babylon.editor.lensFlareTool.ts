module BABYLON.EDITOR {
    export class LensFlareTool extends AbstractDatTool {
        // Public members
        public tab: string = "LENSFLARE.TAB";

        // Private members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof LensFlareSystem) {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
        }

        // Update
        public update(): void {
            var object: LensFlareSystem = this.object = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;
            var core = this._editionTool.core;

            super.update();

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var commonFolder = this._element.addFolder("Common");
            commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");

            // Flares
            for (var i = 0; i < object.lensFlares.length; i++) {
                var lf = object.lensFlares[i];
                var lfFolder = this._element.addFolder("Flare " + i);

                if (i > 0)
                    lfFolder.close();

                var colorFolder = this._element.addFolder("Color", lfFolder);
                colorFolder.add(lf.color, "r").min(0).max(1).name("R");
                colorFolder.add(lf.color, "g").min(0).max(1).name("G");
                colorFolder.add(lf.color, "b").min(0).max(1).name("B");

                lfFolder.add(lf, "position").step(0.1).name("Position");
                lfFolder.add(lf, "size").step(0.1).name("Size");
            }
        }
    }
}