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
            if (!(object instanceof Mesh))
                return false;

            var scene = this._editionTool.core.currentScene;

            for (var i = 0; i < scene.particleSystems.length; i++) {
                var ps = scene.particleSystems[i];
                if (ps.emitter === object) {
                    return true;
                }
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Particles" });
        }

        // Update
        public update(): void {
            var object: Mesh = this.object = this._editionTool.object;
            var particleSystem: ParticleSystem = null;
            var scene = this._editionTool.core.currentScene;

            for (var i = 0; i < scene.particleSystems.length; i++) {
                var ps = scene.particleSystems[i];
                if (ps.emitter === object) {
                    particleSystem = ps;
                    break;
                }
            }

            super.update();

            if (!object || !particleSystem)
                return;

            var psEditor = new GUIParticleSystemEditor(this._editionTool.core, particleSystem, false);
            this._element = psEditor._createEditor(this.containers[0]);
        }
    }
}