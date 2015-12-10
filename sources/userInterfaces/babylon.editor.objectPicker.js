var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ObjectPicker = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ObjectPicker(core) {
                // Public members
                this.core = null;
                this.objectLists = new Array();
                this.propertyToDraw = "name";
                // Private members
                this._window = null;
                this._list = null;
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
            }
            // On event received
            ObjectPicker.prototype.onEvent = function (event) {
                // Manage event
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType !== EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED)
                    return false;
                if (event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Cancel") {
                        this._window.close();
                    }
                    else if (button === "Select") {
                        var selected = this._list.getSelectedRows();
                        if (selected.length === 0) {
                            this._window.notify("Please select at least 1 object...");
                        }
                        else {
                            this._window.close();
                        }
                    }
                    return true;
                }
                return false;
            };
            // Opens the object picker
            ObjectPicker.prototype.open = function () {
                var _this = this;
                //IDs
                var listID = "OBJECT-PICKER-LIST";
                var listDiv = EDITOR.GUI.GUIElement.CreateElement("div", listID);
                // Create window
                this._window = new EDITOR.GUI.GUIWindow("OBJECT-PICKER-WINDOW", this.core, "Select Object...", "");
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    "Select",
                    "Cancel"
                ];
                this._window.setOnCloseCallback(function () {
                    _this.core.removeEventReceiver(_this);
                    _this._list.destroy();
                });
                this._window.buildElement(null);
                // Create list
                this._list = new EDITOR.GUI.GUIGrid(listID, this.core);
                this._list.header = "Objects";
                this._list.createColumn("name", "name", "100%");
                this._list.buildElement(listID);
                for (var i = 0; i < this.objectLists.length; i++) {
                    var list = this.objectLists[i];
                    for (var j = 0; j < list.length; j++) {
                        this._list.addRow({
                            name: list[j][this.propertyToDraw]
                        });
                    }
                }
            };
            return ObjectPicker;
        })();
        EDITOR.ObjectPicker = ObjectPicker;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.objectPicker.js.map