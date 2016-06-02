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
                this.selectedObjects = new Array();
                this.minSelectCount = 1;
                this.windowName = "Select Object...";
                this.selectButtonName = "Select";
                this.closeButtonName = "Close";
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
                    if (button === this.closeButtonName) {
                        if (this.onClosedPicker)
                            this.onClosedPicker();
                        this._window.close();
                    }
                    else if (button === this.selectButtonName) {
                        var selected = this._list.getSelectedRows();
                        if (selected.length < this.minSelectCount) {
                            this._window.notify("Please select at least 1 object...");
                        }
                        else {
                            if (this.onObjectPicked) {
                                var selectedNames = [];
                                for (var i = 0; i < selected.length; i++) {
                                    selectedNames.push(this._list.getRow(selected[i]).name);
                                }
                                this.onObjectPicked(selectedNames);
                            }
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
                this._window = new EDITOR.GUI.GUIWindow("OBJECT-PICKER-WINDOW", this.core, this.windowName, listDiv);
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    this.selectButtonName,
                    this.closeButtonName
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
                var selected = [];
                var recid = 0;
                for (var i = 0; i < this.objectLists.length; i++) {
                    var list = this.objectLists[i];
                    for (var j = 0; j < list.length; j++) {
                        if (list[j] === this.core.camera)
                            continue;
                        this._list.addRecord({
                            name: list[j].name || "Scene",
                            recid: recid
                        });
                        if (this.selectedObjects.indexOf(list[j]) !== -1)
                            selected.push(recid);
                        recid++;
                    }
                }
                this._list.refresh();
                // Set selected
                if (selected.length > 0)
                    this._list.setSelected(selected);
            };
            return ObjectPicker;
        })();
        EDITOR.ObjectPicker = ObjectPicker;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
