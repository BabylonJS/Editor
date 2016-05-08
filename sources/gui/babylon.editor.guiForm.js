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
                    this.fields = [];
                    this.toolbarFields = [];
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
                // Create a toolbar field
                GUIForm.prototype.createToolbarField = function (id, type, caption, img) {
                    var field = { id: name, text: caption, type: type, checked: false, img: img };
                    this.toolbarFields.push(field);
                    return field;
                };
                // Set record
                GUIForm.prototype.setRecord = function (name, value) {
                    this.element.record[name] = value;
                };
                // Get record
                GUIForm.prototype.getRecord = function (name) {
                    return this.element.record[name];
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
                        toolbar: {
                            items: this.toolbarFields,
                            onClick: function (event) {
                                if (_this.onToolbarClicked)
                                    _this.onToolbarClicked(event.target);
                                var ev = new EDITOR.Event();
                                ev.eventType = EDITOR.EventType.GUI_EVENT;
                                ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                                ev.guiEvent.data = event.target;
                                _this.core.sendEvent(ev);
                            }
                        }
                    });
                    this.element.on({ type: "change", execute: "after" }, function () {
                        if (_this.onFormChanged)
                            _this.onFormChanged();
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                        _this.core.sendEvent(ev);
                    });
                };
                return GUIForm;
            })(GUI.GUIElement);
            GUI.GUIForm = GUIForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
