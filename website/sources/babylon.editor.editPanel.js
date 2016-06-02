var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditPanel = (function () {
            /**
            * Constructor
            */
            function EditPanel(core) {
                this.onClose = null;
                // Private members
                this._containers = [];
                this._panelID = "BABYLON-EDITOR-PREVIEW-PANEL";
                this._closeButtonID = "BABYLON-EDITOR-PREVIEW-PANEL-CLOSE";
                // Initialize
                this.core = core;
                this.editor = core.editor;
                this.core.eventReceivers.push(this);
                this.panel = this.editor.layouts.getPanelFromType("preview");
                this._mainPanel = this.editor.layouts.getPanelFromType("main");
                this._addCloseButton();
            }
            // On event
            EditPanel.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                    this._configureCloseButton();
                }
                return false;
            };
            // Adds a new element to the panel
            // Returns true if added, false if already exists by providing the ID
            EditPanel.prototype.addContainer = function (container, id) {
                if (id) {
                    var exists = $("#" + id)[0];
                    if (exists)
                        return false;
                }
                $("#" + this._panelID).append(container);
                return true;
            };
            // Closes the panel
            EditPanel.prototype.close = function () {
                if (this.onClose)
                    this.onClose();
                // Empty div
                $("#" + this._panelID).empty();
                // Free
                this.onClose = null;
                // Create close button
                this._addCloseButton();
            };
            // Sets the panel size
            EditPanel.prototype.setPanelSize = function (percents) {
                var height = this.panel._panelElement.height;
                height += this._mainPanel._panelElement.height;
                this.editor.layouts.setPanelSize("preview", height * percents / 100);
            };
            // Creates close button
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
            // Configures close button
            EditPanel.prototype._configureCloseButton = function () {
                this._closeButton.css("position", "absolute");
                this._closeButton.css("right", "0%");
                this._closeButton.css("z-index", 1000); // Should be enough
                this._closeButton.css("min-width", "0px");
                this._closeButton.css("min-height", "0px");
                //this._closeButton.css("width", "25px");
                //this._closeButton.css("height", "25px");
            };
            return EditPanel;
        }());
        EDITOR.EditPanel = EditPanel;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
