module BABYLON.EDITOR {
    interface IObjectPickerRow extends GUI.IGridRowData {
        name: string;
    }

    export class ObjectPicker implements IEventReceiver {
        // Public members
        public core: EditorCore = null;
        
        public objectLists: Array<any[]> = new Array<any[]>();
        public selectedObjects: Array<any> = new Array<any>();

        public onObjectPicked: (names: string[]) => void;
        public onClosedPicker: () => void;
        public minSelectCount: number = 1;

        public windowName: string = "Select Object...";
        public selectButtonName: string = "Select";
        public closeButtonName: string = "Close";

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
                            var selectedNames: string[] = [];
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
        }

        // Opens the object picker
        public open(): void {
            //IDs
            var listID = "OBJECT-PICKER-LIST";
            var listDiv = GUI.GUIElement.CreateElement("div", listID);

            // Create window
            this._window = new GUI.GUIWindow("OBJECT-PICKER-WINDOW", this.core, this.windowName, listDiv);
            this._window.modal = true;
            this._window.showMax = false;
            this._window.buttons = [
                this.selectButtonName,
                this.closeButtonName
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

            var selected: number[] = [];
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
        }
    }
}
