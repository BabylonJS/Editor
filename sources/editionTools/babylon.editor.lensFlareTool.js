var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LensFlareTool = (function (_super) {
            __extends(LensFlareTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LensFlareTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "LENSFLARE.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
                ];
            }
            // Object supported
            LensFlareTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            LensFlareTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
            };
            // Update
            LensFlareTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");
                commonFolder.add(this, "_addLensFlare").name("Add Lens Flare...");
                // Flares
                for (var i = 0; i < object.lensFlares.length; i++) {
                    this._addLensFlareFolder(object.lensFlares[i], i);
                }
            };
            // Adds a lens flare folder
            LensFlareTool.prototype._addLensFlareFolder = function (lensFlare, indice) {
                var lfFolder = this._element.addFolder("Flare " + indice);
                if (indice > 0)
                    lfFolder.close();
                var colorFolder = this._element.addFolder("Color", lfFolder);
                colorFolder.add(lensFlare.color, "r").min(0).max(1).name("R");
                colorFolder.add(lensFlare.color, "g").min(0).max(1).name("G");
                colorFolder.add(lensFlare.color, "b").min(0).max(1).name("B");
                lfFolder.add(lensFlare, "position").step(0.1).name("Position");
                lfFolder.add(lensFlare, "size").step(0.1).name("Size");
                this._setupChangeTexture(indice);
                lfFolder.add(this, "_changeTexture" + indice).name("Set Texture...");
                this._setupRemove(indice);
                lfFolder.add(this, "_removeLensFlare" + indice).name("Remove...");
            };
            // Add a lens flare
            LensFlareTool.prototype._addLensFlare = function () {
                var lf = EDITOR.SceneFactory.AddLensFlare(this._editionTool.core, this.object, 0.5, 0, new BABYLON.Color3(1, 0, 0));
                this._addLensFlareFolder(lf, this.object.lensFlares.length - 1);
            };
            // Resets "this"
            LensFlareTool.prototype._reset = function () {
                for (var thing in this) {
                    if (thing.indexOf("_removeLensFlare") !== -1) {
                        delete this[thing];
                    }
                    else if (thing.indexOf("_changeTexture") !== -1) {
                        delete this[thing];
                    }
                }
                this.update();
            };
            // Removes a lens flare
            LensFlareTool.prototype._setupRemove = function (indice) {
                var _this = this;
                this["_removeLensFlare" + indice] = function () {
                    _this.object.lensFlares[indice].dispose();
                    _this._reset();
                };
            };
            // Creates a function to change texture of a flare
            LensFlareTool.prototype._setupChangeTexture = function (indice) {
                var _this = this;
                this["_changeTexture" + indice] = function () {
                    var input = EDITOR.Tools.CreateFileInpuElement("LENS-FLARE-LOAD-TEXTURE");
                    input.change(function (data) {
                        var files = data.target.files || data.currentTarget.files;
                        if (files.length < 1)
                            return;
                        var file = files[0];
                        BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                            var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._editionTool.core.currentScene);
                            texture.name = texture.name.replace("data:", "");
                            _this.object.lensFlares[indice].texture = texture;
                            input.remove();
                        }, null);
                    });
                    input.click();
                };
            };
            return LensFlareTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.LensFlareTool = LensFlareTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.lensFlareTool.js.map