module BABYLON.EDITOR {
    interface IObjectPickerRow extends GUI.IGridRowData {
        name: string;
    }

    export class ObjectPicker implements IEventReceiver {
        // Public members
        public core: EditorCore = null;
        public onSelectCallback: (objectId: string) => void;
        
        public objectLists: Array<any[]> = new Array<any[]>();
        public propertyToDraw: string = "name";

        // Private members
        private _window: GUI.GUIWindow = null;
        private _list: GUI.GUIGrid<IObjectPickerRow> = null;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
            this.core.eventReceivers.push(this);
        }

        // On event received
        public onEvent(event: Event): boolean {
            // Manage event
            if (event.eventType !== EventType.GUI_EVENT)
                return false;

            if (event.guiEvent.eventType !== GUIEventType.WINDOW_BUTTON_CLICKED)
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
        }

        // Opens the object picker
        public open(): void {
            //IDs
            var listID = "OBJECT-PICKER-LIST";
            var listDiv = GUI.GUIElement.CreateElement("div", listID);

            // Create window
            this._window = new GUI.GUIWindow("OBJECT-PICKER-WINDOW", this.core, "Select Object...", "");
            this._window.modal = true;
            this._window.showMax = false;
            this._window.buttons = [
                "Select",
                "Cancel"
            ];

            this._window.setOnCloseCallback(() => {
                this.core.removeEventReceiver(this);
                this._list.destroy();
            });

            this._window.buildElement(null);

            // Create list
            this._list = new GUI.GUIGrid<IObjectPickerRow>(listID, this.core);
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
        }
    }
}
