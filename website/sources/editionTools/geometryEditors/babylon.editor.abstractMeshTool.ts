module BABYLON.EDITOR {
    export class AbstractMeshTool<T extends Mesh> extends AbstractDatTool {
        // Public members

        // Private members
        private _tabName: string = "New Tab";

        // Protected members
        protected onObjectSupported: (mesh: Mesh) => boolean
        protected mesh: T = null;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool, containerID: string, tabID: string, tabName: string) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-" + containerID
            ];

            this.tab = "MESH." + tabID;
            this._tabName = tabName;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh && this.onObjectSupported(object))
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
        }

        // Update
        public update(): boolean {
            var object: any = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;

            super.update();

            this.mesh = object;
            this.object = object;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            return true;
        }
    }
}