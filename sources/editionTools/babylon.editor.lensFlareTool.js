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
            function LensFlareTool(editionTool) {
                _super.call(this, editionTool);
                this.tab = "LENSFLARE.TAB";
                this._dummyProperty = "Lens Flare 1";
                this._currentLensFlareId = 0;
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
                ];
            }
            LensFlareTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            LensFlareTool.prototype.createUI = function () {
                this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
            };
            LensFlareTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");
                commonFolder.add(this, "_addLensFlare").name("Add Lens Flare...");
                var lensFlares = [];
                for (var i = 0; i < object.lensFlares.length; i++)
                    lensFlares.push("Lens Flare " + (i + 1));
                commonFolder.add(this, "_dummyProperty", lensFlares).name("Lens Flare :").onFinishChange(function (result) {
                    var indice = parseFloat(result.split("Lens Flare ")[1]);
                    if (typeof indice === "number") {
                        indice--;
                        _this._currentLensFlareId = indice;
                    }
                    _this.update();
                });
                var lensFlare = object.lensFlares[this._currentLensFlareId];
                if (!lensFlare)
                    return false;
                var lfFolder = this._element.addFolder("Lens Flare");
                var colorFolder = this._element.addFolder("Color", lfFolder);
                colorFolder.add(lensFlare.color, "r").min(0).max(1).name("R");
                colorFolder.add(lensFlare.color, "g").min(0).max(1).name("G");
                colorFolder.add(lensFlare.color, "b").min(0).max(1).name("B");
                lfFolder.add(lensFlare, "position").step(0.1).name("Position");
                lfFolder.add(lensFlare, "size").step(0.1).name("Size");
                this.addTextureFolder(lensFlare, "Texture", "texture", lfFolder).open();
                this._setupRemove(this._currentLensFlareId);
                lfFolder.add(this, "_removeLensFlare" + this._currentLensFlareId).name("Remove...");
                this._currentLensFlareId = 0;
                this._dummyProperty = "Lens Flare 1";
                return true;
            };
            LensFlareTool.prototype._addLensFlare = function () {
                var lf = EDITOR.SceneFactory.AddLensFlare(this._editionTool.core, this.object, 0.5, 0, new BABYLON.Color3(1, 0, 0));
                this.update();
            };
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
            LensFlareTool.prototype._setupRemove = function (indice) {
                var _this = this;
                this["_removeLensFlare" + indice] = function () {
                    _this.object.lensFlares[indice].dispose();
                    _this._reset();
                };
            };
            return LensFlareTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.LensFlareTool = LensFlareTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
