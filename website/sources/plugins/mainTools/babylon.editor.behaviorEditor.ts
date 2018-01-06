module BABYLON.EDITOR {
    interface IBehaviorItem extends GUI.IGridRowData {
        name: string;
    }

    interface ISample {
        samples: {
            name: string;
            file: string;
            description: string;
            icon?: string;
        }[];
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
        private _toolbar: GUI.GUIToolbar = null;
        
        private _currentNode: Node | Scene = null;

        private _currentScript: EXTENSIONS.IBehaviorCode = null;
        private _scripts: string[] = [];

        // Statics
        private static _Template: string = null;
        private static _Samples: ISample = null;
        private static _ToolbarIds = ["activate"];

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
                BABYLON.Tools.LoadFile("website/resources/behavior/behavior.editor.txt", (data: string) => {
                    BehaviorEditor._Template = data;

                    BABYLON.Tools.LoadFile("website/resources/behavior/samples.json", (data: string) => {
                        BehaviorEditor._Samples = JSON.parse(data);
                        this._createUI();
                    });
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
            this._toolbar.destroy();
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

                    // Disable toolbar
                    this._toolbar.setItemsEnabled(BehaviorEditor._ToolbarIds, false);

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
            this._layouts.createPanel("BEHAVIOR-EDITOR-TOP-PANEL", "top", 50, false).setContent(GUI.GUIElement.CreateElement("div", "BEHAVIOR-EDITOR-TOOLBAR"));
            this._layouts.createPanel("BEHAVIOR-EDITOR-RIGHT-PANEL", "main", undefined, true).setContent(GUI.GUIElement.CreateDivElement("BEHAVIOR-EDITOR-CODE", "width: 100%; height: 100%;"));
            this._layouts.buildElement(this._containerID);

            // Toolbar
            this._toolbar = new GUI.GUIToolbar("BEHAVIOR-EDITOR-TOOLBAR", this._core);

            var samples = this._toolbar.createMenu("menu", "samples", "Samples", "icon-behavior-editor");
            for (var i = 0; i < BehaviorEditor._Samples.samples.length; i++) {
                var sample = BehaviorEditor._Samples.samples[i];
                this._toolbar.createMenuItem(samples, "button", "sample" + i, sample.name, "icon-copy");
            }

            this._toolbar.createMenu("button", "import", "Import...", "icon-copy");
            this._toolbar.createMenu("check", "activate", "Activated", "icon-play-game", true);

            this._toolbar.onClick = (item) => this._toolbarClicked(item);
            this._toolbar.buildElement("BEHAVIOR-EDITOR-TOOLBAR");
            this._toolbar.setItemsEnabled(BehaviorEditor._ToolbarIds, false);

            // List
            this._list = new GUI.GUIGrid<IBehaviorItem>("BEHAVIOR-EDITOR-EDIT", this._core);
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
        private _addScript(content?: string, name?: string): void {
            if (!content) {
                // ctor
                var ctor = Tools.GetConstructorName(this._currentNode).toLowerCase();
                if (this._currentNode instanceof DirectionalLight)
                    ctor = "dirlight";
                else if (this._currentNode instanceof HemisphericLight)
                    ctor = "hemlight";

                var code = BehaviorEditor._Template;

                while (code.indexOf("{{type}}") !== -1)
                    code = code.replace("{{type}}", ctor);
            }
            else {
                code = content;
            }

            // Register metadata
            var data = <EXTENSIONS.IBehaviorCode> {
                code: code,
                name: name ? name : "scripts " + SceneFactory.GenerateUUID(),
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

            // Enable scripts toolbar
            this._toolbar.setItemsEnabled(BehaviorEditor._ToolbarIds, true);
            this._toolbar.setItemChecked("activate", this._currentScript.active);

            // Set options in toolbar
            this._toolbar.setItemChecked("activate", this._currentScript.active);
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

        // on tool bar selected
        private _toolbarClicked(item: GUI.IToolbarClick): void {
            if (!this._currentNode)
                return;

            if (!item.hasParent) {
                if (this._currentScript && item.parent === "activate") {
                    this._currentScript.active = !this._toolbar.isItemChecked("activate");
                } else if (item.parent === "import") {
                    var input = Tools.CreateFileInpuElement("IMPORT-BEHAVIOR-SCRIPT");
                    input[0].onchange = (event: JQueryInputEventObject) => {
                        var name = event.target["files"][0].name;
                        var extension = Tools.GetFileExtension(name);

                        BABYLON.Tools.ReadFile(event.target["files"][0], (data: string) => {
                            if (extension === "js")
                                this._addScript(data, name);
                            else if (extension === "editorproject") {
                                this._importFromProject(JSON.parse(data));
                            }
                        }, null, false);
                    };
                    input.click();
                }
            }
            else {
                if (item.selected.indexOf("sample") === 0) {
                    var id = parseInt(item.selected.replace("sample", ""));
                    var sample = BehaviorEditor._Samples.samples[id];

                    BABYLON.Tools.LoadFile("website/resources/behavior/" + sample.file, (data: string) => {
                        this._addScript(data, sample.name);
                    });
                }
            }
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

        // Imports selected scripts from project
        private _importFromProject(project: INTERNAL.IProjectRoot): void {
            var metadatas: EXTENSIONS.IBehaviorMetadata[] = project.customMetadatas["BehaviorExtension"];
            if (!metadatas)
                return GUI.GUIWindow.CreateAlert("No Behavior Script found...", "Cannot import...");

            var scripts: { name: string, code: string }[] = [];
            for (var i = 0; i < metadatas.length; i++) {
                var data = metadatas[i];

                for (var j = 0; j < data.metadatas.length; j++) {
                    scripts.push({ name: data.node + " - " + data.metadatas[j].name, code: data.metadatas[j].code });
                }
            }

            var picker = new ObjectPicker(this._core);
            picker.objectLists.push(scripts);
            picker.onObjectPicked = (names, selected) => {
                debugger;
                for (var i = 0; i < selected.length; i++) {
                    var script = scripts[i];
                    this._addScript(script.code, script.name);
                }
            };
            picker.open();
        }
    }
}
