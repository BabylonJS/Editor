module BABYLON.EDITOR {
    export class ParticleSystemTool extends AbstractDatTool {
        // Public members
        public tab: string = "PARTICLE.SYSTEM.TAB";

        // Private members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-PARTICLE-SYSTEM"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof ParticleSystem)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Particles" });
        }

        // Update
        public update(): boolean {
            var object: ParticleSystem = this.object = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;

            super.update();

            // Configure main toolbar
            var toolbar = this._editionTool.core.editor.mainToolbar;
            toolbar.toolbar.setItemEnabled(toolbar.particleSystemCopyItem.id, object !== null, toolbar.particleSystemMenu.id);
            toolbar.toolbar.setItemEnabled(toolbar.particleSystemPasteItem.id, object instanceof ParticleSystem, toolbar.particleSystemMenu.id);

            GUIParticleSystemEditor._CurrentParticleSystem = object;

            if (!object)
                return false;

            var psEditor = new GUIParticleSystemEditor(this._editionTool.core, object, false);
            this._element = psEditor._createEditor(this.containers[0]);

            return true;
        }
    }
}