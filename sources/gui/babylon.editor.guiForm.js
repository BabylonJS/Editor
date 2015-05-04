var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIForm = (function (_super) {
                __extends(GUIForm, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIForm(name, header) {
                    if (header === void 0) { header = ""; }
                    _super.call(this, name);
                    this.fields = new Array();
                    // Initialize
                    this.header = header;
                }
                // Create a field
                GUIForm.prototype.createField = function (name, type, caption, span, text, options) {
                    if (span === void 0) { span = undefined; }
                    if (text === void 0) { text = ""; }
                    if (options === void 0) { options = {}; }
                    span = (span === null) ? 6 : span;
                    var field = { name: name, type: type, html: { caption: caption, span: span, text: text }, options: options };
                    this.fields.push(field);
                    return this;
                };
                // Set record
                GUIForm.prototype.setRecord = function (name, value) {
                    this.element.record[name] = value;
                };
                // Build element
                GUIForm.prototype.buildElement = function (parent) {
                    this.element = $("#" + parent).w2form({
                        name: this.name,
                        focus: -1,
                        header: this.header,
                        formHTML: "",
                        fields: this.fields,
                        onChange: function (event) {
                        }
                    });
                };
                return GUIForm;
            })(GUI.GUIElement);
            GUI.GUIForm = GUIForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
