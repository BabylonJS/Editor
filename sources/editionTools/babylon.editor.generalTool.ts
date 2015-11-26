module BABYLON.EDITOR {
    export class GeneralTool extends AbstractTool {
        // Public members
        public object: Node = null;

        public tab: string = "GENERAL.TAB";

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
                "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh
                || object instanceof Light
                || object instanceof Camera
                || object instanceof ParticleSystem)
            {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "General" });
        }

        // Update
        public update(): void {
            var object: any = this._editionTool.object;

            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);

            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name");

            var transformFolder = this._element.addFolder("Transforms");

            if (object.position) {
                var positionFolder = this._element.addFolder("Position", transformFolder);
                positionFolder.add(object.position, "x").name("Position X").step(0.1);
                positionFolder.add(object.position, "y").name("Position Y").step(0.1);
                positionFolder.add(object.position, "z").name("Position Z").step(0.1);
            }

            if (object.rotation) {
                var rotationFolder = this._element.addFolder("Rotation", transformFolder);
                rotationFolder.add(object.rotation, "x").name("Rotation X").step(0.1);
                rotationFolder.add(object.rotation, "y").name("Rotation Y").step(0.1);
                rotationFolder.add(object.rotation, "z").name("Rotation Z").step(0.1);
            }

            if (object.scaling) {
                var scalingFolder = this._element.addFolder("Scaling", transformFolder);
                scalingFolder.add(object.scaling, "x").name("Scaling X").step(0.1);
                scalingFolder.add(object.scaling, "y").name("Scaling Y").step(0.1);
                scalingFolder.add(object.scaling, "z").name("Scaling Z").step(0.1);
            }
        }

        // Resize
        public resize(): void {
            this._element.width = this._editionTool.panel.width - 15;
        }
    }
}