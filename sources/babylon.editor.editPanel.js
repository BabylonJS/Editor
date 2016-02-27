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
                // Initialize
                this.core = core;
                this.editor = core.editor;
                this.panel = this.editor.layouts.getPanelFromType("preview");
                this._mainPanel = this.editor.layouts.getPanelFromType("main");
            }
            // Adds a new element to the panel
            // Returns true if added, false if already exists by providing the ID
            EditPanel.prototype.addContainer = function (container, id) {
                if (id) {
                    var exists = $("#" + id)[0];
                    if (exists)
                        return false;
                }
                $("#BABYLON-EDITOR-PREVIEW-PANEL").append(container);
                return true;
            };
            // Closes the panel
            EditPanel.prototype.close = function () {
                if (this.onClose)
                    this.onClose();
                // Empty div
                $("#BABYLON-EDITOR-PREVIEW-PANEL").empty();
                // Free
                this.onClose = null;
            };
            // Sets the panel size
            EditPanel.prototype.setPanelSize = function (percents) {
                var height = this.panel._panelElement.height;
                height += this._mainPanel._panelElement.height;
                this.editor.layouts.setPanelSize("preview", height * percents / 100);
            };
            return EditPanel;
        })();
        EDITOR.EditPanel = EditPanel;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
