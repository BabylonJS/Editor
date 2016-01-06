var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ParticleSystemTool = (function (_super) {
            __extends(ParticleSystemTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ParticleSystemTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "PARTICLE.SYSTEM.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-PARTICLE-SYSTEM"
                ];
            }
            // Object supported
            ParticleSystemTool.prototype.isObjectSupported = function (object) {
                if (!(object instanceof BABYLON.Mesh))
                    return false;
                var scene = this._editionTool.core.currentScene;
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    var ps = scene.particleSystems[i];
                    if (ps.emitter === object) {
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            ParticleSystemTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Particle System" });
            };
            // Update
            ParticleSystemTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                var particleSystem = null;
                var scene = this._editionTool.core.currentScene;
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    var ps = scene.particleSystems[i];
                    if (ps.emitter === object) {
                        particleSystem = ps;
                        break;
                    }
                }
                _super.prototype.update.call(this);
                if (!object || !particleSystem)
                    return;
                var psEditor = new EDITOR.GUIParticleSystemEditor(this._editionTool.core, particleSystem, false);
                this._element = psEditor._createEditor(this.containers[0]);
            };
            return ParticleSystemTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.ParticleSystemTool = ParticleSystemTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.particleSystemTool.js.map