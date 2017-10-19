module BABYLON.EDITOR {
    export class SettingsTool extends AbstractDatTool {
        // Public members
        public tab: string = "SETTINGS.TAB";

        // Private members
        private _fogType: string = "";
        private _physicsEnabled: boolean = false;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-SETTINGS"
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
            this._editionTool.panel.createTab({ id: this.tab, caption: "Settings" });
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
            this._element.add(SceneFactory.Settings, "exportTexturesContent").name("Export textures content").onChange(() => Settings.Apply(this._core));

            return true;
        }
    }
}