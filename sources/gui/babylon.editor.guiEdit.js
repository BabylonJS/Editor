var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIEditForm = (function (_super) {
                __extends(GUIEditForm, _super);
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIEditForm(name) {
                    _super.call(this, name);
                }
                // Add a folder
                GUIEditForm.prototype.addFolder = function (name) {
                    return this._datElement.addFolder(name);
                };
                // Add a field
                GUIEditForm.prototype.add = function (object, propertyPath, name) {
                    return this._datElement.add(object, propertyPath).name(name);
                };
                // Build element
                GUIEditForm.prototype.buildElement = function (parent) {
                    var parentElement = $("#" + parent);
                    this._datElement = new dat.GUI({
                        autoPlace: false
                    });
                    this._datElement.width = parentElement.width();
                    this.element = parentElement[0].appendChild(this._datElement.domElement);
                };
                return GUIEditForm;
            })(GUI.GUIElement);
            GUI.GUIEditForm = GUIEditForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
