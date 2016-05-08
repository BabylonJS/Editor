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
            function ParticleSystemTool(editionTool) {
                _super.call(this, editionTool);
                this.tab = "PARTICLE.SYSTEM.TAB";
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-PARTICLE-SYSTEM"
                ];
            }
            ParticleSystemTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ParticleSystem)
                    return true;
                return false;
            };
            ParticleSystemTool.prototype.createUI = function () {
                this._editionTool.panel.createTab({ id: this.tab, caption: "Particles" });
            };
            ParticleSystemTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                var toolbar = this._editionTool.core.editor.mainToolbar;
                toolbar.toolbar.setItemEnabled(toolbar.particleSystemCopyItem.id, object !== null, toolbar.particleSystemMenu.id);
                toolbar.toolbar.setItemEnabled(toolbar.particleSystemPasteItem.id, object instanceof BABYLON.ParticleSystem, toolbar.particleSystemMenu.id);
                EDITOR.GUIParticleSystemEditor._CurrentParticleSystem = object;
                if (!object)
                    return false;
                var psEditor = new EDITOR.GUIParticleSystemEditor(this._editionTool.core, object, false);
                this._element = psEditor._createEditor(this.containers[0]);
                return true;
            };
            return ParticleSystemTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.ParticleSystemTool = ParticleSystemTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
