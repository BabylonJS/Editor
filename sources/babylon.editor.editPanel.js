var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditPanel = (function () {
            function EditPanel(core) {
                this.onClose = null;
                this._containers = [];
                this._panelID = "BABYLON-EDITOR-PREVIEW-PANEL";
                this._closeButtonID = "BABYLON-EDITOR-PREVIEW-PANEL-CLOSE";
                this.core = core;
                this.editor = core.editor;
                this.core.eventReceivers.push(this);
                this.panel = this.editor.layouts.getPanelFromType("preview");
                this._mainPanel = this.editor.layouts.getPanelFromType("main");
                this._addCloseButton();
            }
            EditPanel.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                    this._configureCloseButton();
                }
                return false;
            };
            EditPanel.prototype.addContainer = function (container, id) {
                if (id) {
                    var exists = $("#" + id)[0];
                    if (exists)
                        return false;
                }
                $("#" + this._panelID).append(container);
                return true;
            };
            EditPanel.prototype.close = function () {
                if (this.onClose)
                    this.onClose();
                $("#" + this._panelID).empty();
                this.onClose = null;
                this._addCloseButton();
            };
            EditPanel.prototype.setPanelSize = function (percents) {
                var height = this.panel._panelElement.height;
                height += this._mainPanel._panelElement.height;
                this.editor.layouts.setPanelSize("preview", height * percents / 100);
            };
            EditPanel.prototype._addCloseButton = function () {
                var _this = this;
                $("#" + this._panelID).append(EDITOR.GUI.GUIElement.CreateElement("button class=\"btn w2ui-msg-title w2ui-msg-button\"", this._closeButtonID, ""));
                this._closeButton = $("#" + this._closeButtonID);
                this._closeButton.text("x");
                this._configureCloseButton();
                this._closeButton.click(function (event) {
                    _this.close();
                    _this.setPanelSize(0);
                });
            };
            EditPanel.prototype._configureCloseButton = function () {
                this._closeButton.css("position", "absolute");
                this._closeButton.css("right", "0%");
                this._closeButton.css("z-index", 1000);
                this._closeButton.css("min-width", "0px");
                this._closeButton.css("min-height", "0px");
            };
            return EditPanel;
        }());
        EDITOR.EditPanel = EditPanel;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
