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
            var GUIForm = (function (_super) {
                __extends(GUIForm, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIForm(name, header, core) {
                    if (header === void 0) { header = ""; }
                    _super.call(this, name, core);
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
                    var _this = this;
                    this.element = $("#" + parent).w2form({
                        name: this.name,
                        focus: -1,
                        header: this.header,
                        formHTML: "",
                        fields: this.fields,
                        onChange: function (event) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIForm;
            })(GUI.GUIElement);
            GUI.GUIForm = GUIForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.guiForm.js.map