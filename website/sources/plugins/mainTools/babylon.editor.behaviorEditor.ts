module BABYLON.EDITOR {
    interface IBehaviorItem extends GUI.IGridRowData {
        name: string;
    }

    export class BehaviorEditor implements ITabApplication, IEventReceiver {
        // Private members
        private _core: EditorCore;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _editor: GUI.GUICodeEditor = null;
        private _list: GUI.GUIGrid<IBehaviorItem> = null;
        
        private _currentNode: Node | Scene = null;

        private _currentScript: EXTENSIONS.IBehaviorCode = null;
        private _scripts: string[] = [];

        // Statics
        private static _Template: string = null;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;

            // Metadatas
            var metadatas = SceneManager.GetCustomMetadata("BehaviorExtension") || [];
            SceneManager.AddCustomMetadata("BehaviorExtension", metadatas);

            // Finish
            if (!BehaviorEditor._Template) {
                BABYLON.Tools.LoadFile("website/resources/behavior.editor.txt", (data) => {
                    BehaviorEditor._Template = data;
                    this._createUI();
                });
            }
            else
                this._createUI();
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._layouts.destroy();
            this._list.destroy();
            this._editor.destroy();

            this._core.removeEventReceiver(this);
        }

        /**
        * On event 
        */
        public onEvent(event: IEvent): boolean {
            if (event.eventType === EventType.SCENE_EVENT && event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                var object = event.sceneEvent.object;
                if (object instanceof Node || object instanceof Scene) {
                    object.metadata = object.metadata || { };

                    // Reset editor
                    this._currentNode = null;
                    this._editor.element.setValue("");

                    // Register metadata and set current node
                    object.metadata["behavior"] = object.metadata["behavior"] || [];
                    this._currentNode = object;

                    // Scripts lits
                    this._configureList();
                }
            }

            return false;
        }

        // Creates the UI
        private _createUI(): void {
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Behavior Editor", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Layouts
            this._layouts = new GUI.GUILayout(this._containerID, this._core);
            this._layouts.createPanel("BEHAVIOR-EDITOR-LEFT-PANEL", "left", 350, false).setContent(GUI.GUIElement.CreateElement("div", "BEHAVIOR-EDITOR-EDIT"));
            this._layouts.createPanel("BEHAVIOR-EDITOR-RIGHT-PANEL", "main", undefined, true).setContent(GUI.GUIElement.CreateDivElement("BEHAVIOR-EDITOR-CODE", "width: 100%; height: 100%;"));
            this._layouts.buildElement(this._containerID);

            // List
            this._list = new GUI.GUIGrid<IBehaviorItem>("BehaviorList", this._core);
            this._list.showAdd = true;
            this._list.showDelete = true;
            this._list.onAdd = () => this._addScript();
            this._list.onDelete = (selected) => this._deleteScript(selected);
            this._list.onClick = () => this._selectScript();
            this._list.onChange = (recid, value) => this._changeScript(recid, value);
            this._list.createEditableColumn("name", "Name", { type: "string" }, "100%");
            this._list.buildElement("BEHAVIOR-EDITOR-EDIT");

            // Editor
            this._layouts.lockPanel("main", "Loading...", true);

            this._editor = new GUI.GUICodeEditor("Behavior Code Editor", this._core);
            this._editor.onReady = () => {
                this._layouts.unlockPanel("main");

                this._core.eventReceivers.push(this);
                this._bindEvents();
            };
            this._editor.buildElement("BEHAVIOR-EDITOR-CODE");
        }

        // Adds a new script
        private _addScript(): void {
            // ctor
            var ctor = Tools.GetConstructorName(this._currentNode).toLowerCase();
            var code = BehaviorEditor._Template;

            while (code.indexOf("{{type}}") !== -1)
                code = code.replace("{{type}}", ctor);

            // Register metadata
            var data = <EXTENSIONS.IBehaviorCode> {
                code: code,
                name: "scripts " + SceneFactory.GenerateUUID(),
                active: true
            };

            this._currentNode.metadata["behavior"].push(data);
            this._configureList();

            // Set code
            this._currentScript = data;
            this._editor.element.setValue(this._currentScript.code);
        }

        // Select current script
        private _selectScript(): void {
            var rows = this._list.getSelectedRows();
            if (rows.length < 1)
                return;

            this._currentScript = this._currentNode.metadata["behavior"][rows[0]];
            this._editor.element.setValue(this._currentScript.code);
        }

        // Change script
        private _changeScript(recid: number, value: string): void {
            if (!this._currentNode)
                return;

            var metadatas = <EXTENSIONS.IBehaviorCode[]> this._currentNode.metadata["behavior"];
            if (recid > metadatas.length)
                return;

            metadatas[recid].name = value;
            this._list.refresh();
        }

        // Delete script
        private _deleteScript(recid: number[]): void {
            if (!this._currentNode || recid.length < 1)
                return;

            var metadatas = <EXTENSIONS.IBehaviorCode[]> this._currentNode.metadata["behavior"];
            if (recid[0] > metadatas.length)
                return;

            metadatas.splice(recid[0], 1);
            this._currentScript = null;

            if (this._currentScript)
                this._editor.element.setValue("");
        }

        // Configures the list
        private _configureList(): void {
            var metadatas = <EXTENSIONS.IBehaviorCode[]> this._currentNode.metadata["behavior"];
            this._list.clear();

            for (var i = 0; i < metadatas.length; i++) {
                this._list.addRecord({
                    name: metadatas[i].name,
                    recid: i
                });
            }

            this._list.refresh();
        }

        // Bind the events
        private _bindEvents(): void {
            this._editor.element.onDidChangeModelContent(() => {
                if (this._currentNode && this._currentScript) {
                    this._currentScript.code = this._editor.element.getValue();

                    //var ext = new EXTENSIONS.BehaviorExtension(this._core.currentScene);
                    //ext.apply(null);
                }
            });
        }
    }
}
