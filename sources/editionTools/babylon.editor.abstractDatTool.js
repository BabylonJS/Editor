var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractDatTool = (function (_super) {
            __extends(AbstractDatTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractDatTool(editionTool) {
                // Initialize
                _super.call(this, editionTool);
            }
            // Update
            AbstractDatTool.prototype.update = function () {
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                return true;
            };
            // Resize
            AbstractDatTool.prototype.resize = function () {
                if (this._element)
                    this._element.width = this._editionTool.panel.width - 15;
            };
            /**
            * Static methods
            */
            // Add a color element
            AbstractDatTool.prototype.addColorFolder = function (color, propertyName, open, parent, callback) {
                if (open === void 0) { open = false; }
                var properties = ["r", "g", "b"];
                if (color instanceof BABYLON.Color4)
                    properties.push("a");
                var folder = this._element.addFolder(propertyName, parent);
                for (var i = 0; i < properties.length; i++) {
                    folder.add(color, properties[i]).min(0).max(1).name(properties[i]).onChange(function (result) {
                        if (callback)
                            callback();
                    });
                }
                if (!open)
                    folder.close();
                return folder;
            };
            // Add a vector element
            AbstractDatTool.prototype.addVectorFolder = function (vector, propertyName, open, parent, callback) {
                if (open === void 0) { open = false; }
                var properties = ["x", "y"];
                if (vector instanceof BABYLON.Vector3)
                    properties.push("z");
                var folder = this._element.addFolder(propertyName, parent);
                for (var i = 0; i < properties.length; i++) {
                    folder.add(vector, properties[i]).step(0.01).name(properties[i]).onChange(function (result) {
                        if (callback)
                            callback();
                    });
                }
                if (!open)
                    folder.close();
                return folder;
            };
            // Adds a texture element
            AbstractDatTool.prototype.addTextureFolder = function (object, name, property, parentFolder, callback) {
                var _this = this;
                var stringName = name.replace(" ", "");
                var functionName = "_set" + stringName;
                var textures = ["None"];
                var scene = this._editionTool.core.currentScene;
                for (var i = 0; i < scene.textures.length; i++) {
                    textures.push(scene.textures[i].name);
                }
                this[functionName] = function () {
                    var textureEditor = new EDITOR.GUITextureEditor(_this._editionTool.core, name, object, property);
                };
                this[stringName] = (object[property] && object[property] instanceof BABYLON.BaseTexture) ? object[property].name : textures[0];
                var folder = this._element.addFolder(name, parentFolder);
                folder.close();
                folder.add(this, functionName).name("Browse...");
                folder.add(this, stringName, textures).name("Choose").onChange(function (result) {
                    if (result === "None") {
                        object[property] = undefined;
                    }
                    else {
                        for (var i = 0; i < scene.textures.length; i++) {
                            if (scene.textures[i].name === result) {
                                object[property] = scene.textures[i];
                                break;
                            }
                        }
                    }
                    if (callback)
                        callback();
                });
                return folder;
            };
            return AbstractDatTool;
        })(EDITOR.AbstractTool);
        EDITOR.AbstractDatTool = AbstractDatTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
