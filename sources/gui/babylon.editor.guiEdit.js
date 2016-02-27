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
                function GUIEditForm(name, core) {
                    _super.call(this, name, core);
                }
                // Removes the element
                GUIEditForm.prototype.remove = function () {
                    this._datElement.domElement.parentNode.removeChild(this._datElement.domElement);
                };
                // Add a folder
                GUIEditForm.prototype.addFolder = function (name, parent) {
                    var parentFolder = parent ? parent : this._datElement;
                    var folder = parentFolder.addFolder(name);
                    folder.open();
                    return folder;
                };
                // Add a field
                GUIEditForm.prototype.add = function (object, propertyPath, items, name) {
                    if (!object || object[propertyPath] === undefined || object[propertyPath] === null)
                        return this._datElement.add(null, "");
                    return this._datElement.add(object, propertyPath, items).name(name);
                };
                // Adds tags to object if property changed
                GUIEditForm.prototype.tagObjectIfChanged = function (element, object, property) {
                    element.onFinishChange(function (result) {
                        if (!BABYLON.Tags.HasTags(object)) {
                            BABYLON.Tags.EnableFor(object);
                        }
                        if (!BABYLON.Tags.MatchesQuery(object, property)) {
                            BABYLON.Tags.AddTagsTo(object, property);
                        }
                    });
                };
                Object.defineProperty(GUIEditForm.prototype, "width", {
                    get: function () {
                        return this._datElement.width;
                    },
                    // Get / Set width
                    set: function (width) {
                        this._datElement.width = width;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(GUIEditForm.prototype, "height", {
                    get: function () {
                        return this._datElement.height;
                    },
                    // Get / Set height
                    set: function (height) {
                        this._datElement.height = height;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Remember initial
                GUIEditForm.prototype.remember = function (object) {
                    this._datElement.remember(object);
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
