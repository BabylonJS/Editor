module BABYLON.EDITOR {
    export class ReflectionProbeTool extends AbstractDatTool {
        // Public members
        public object: Node = null;

        public tab: string = "REFLECTION.PROBE.TAB";

        // Private members
        private _window: GUI.GUIWindow = null;
        private _excludedMeshesList: GUI.GUIList = null;
        private _includedMeshesList: GUI.GUIList = null;

        private _layout: GUI.GUILayout = null;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-REFLECTION-PROBE"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof ReflectionProbe) {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Reflection Probe" });
        }

        // Update
        public update(): void {
            super.update();

            var object: AbstractMesh = this.object = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name");
            generalFolder.add(object, "refreshRate").name("Refresh Rate").min(1.0).step(1);
            generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");

            // Position
            var positionFolder = this._element.addFolder("Position");
            positionFolder.add(object.position, "x").step(0.01);
            positionFolder.add(object.position, "y").step(0.01);
            positionFolder.add(object.position, "z").step(0.01);
        }

        private _setIncludedMeshes(): void {
            var body = GUI.GUIElement.CreateElement("div", "REFLECTION-PROBES-RENDER-LIST-LAYOUT");

            this._window = new GUI.GUIWindow("REFLECTION-PROBES-RENDER-LIST-WINDOW", this._editionTool.core, "Configure Render List", body);
            this._window.modal = true;
            this._window.size.x = 800;
            this._window.buildElement(null);
        }
    }
}