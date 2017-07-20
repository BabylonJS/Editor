module BABYLON.EDITOR {
    export interface IBehaviorCode {
        code: string;
        name: string;
        active: boolean;
    }

    export class BehaviorEditor implements ITabApplication, IEventReceiver {
        // Private members
        private _core: EditorCore;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _editor: GUI.GUICodeEditor = null;
        private _edit: GUI.GUIEditForm = null;
        
        private _currentNode: Node = null;

        private _currentScript: IBehaviorCode = null;
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
            this._editor.destroy();

            this._core.removeEventReceiver(this);
        }

        /**
        * On event 
        */
        public onEvent(event: IEvent): boolean {
            if (event.eventType === EventType.SCENE_EVENT && event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                var object = event.sceneEvent.object;
                if (object instanceof Node) {
                    object.metadata = object.metadata || { };

                    // ctor
                    var ctor = Tools.GetConstructorName(object).toLowerCase();
                    var code = BehaviorEditor._Template;

                    while (code.indexOf("{{type}}") !== -1)
                        code = code.replace("{{type}}", ctor);

                    // Register metadata
                    object.metadata["behavior"] = object.metadata["behavior"] || <IBehaviorCode[]> [{
                        code: code,
                        name: "scripts",
                        active: true
                    }];

                    this._currentNode = object;

                    // Edit form
                    this._configureEditForm();

                    // Set code
                    this._editor.element.setValue(object.metadata["behavior"][0].code);
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
            this._layouts.createPanel("BEHAVIOR-EDITOR-LEFT-PANEL", "left", 250, false).setContent(GUI.GUIElement.CreateElement("div", "BEHAVIOR-EDITOR-EDIT"));
            this._layouts.createPanel("BEHAVIOR-EDITOR-RIGHT-PANEL", "main", undefined, true).setContent(GUI.GUIElement.CreateDivElement("BEHAVIOR-EDITOR-CODE", "width: 100%; height: 100%;"));
            this._layouts.buildElement(this._containerID);

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

        // Configures the edit form
        private _configureEditForm(): void {
            if (this._edit)
                this._edit.remove();
            
            this._edit = new GUI.GUIEditForm("Edit Behavior", this._core);
            this._edit.buildElement("BEHAVIOR-EDITOR-EDIT");

            // Scripts
            this._scripts = [];
            var datas = <IBehaviorCode[]> this._currentNode.metadata["behavior"];

            for (var i = 0; i < datas.length; i++)
                this._scripts.push(datas[i].name);

            this._currentScript = datas[0];
            this._edit.add(this._currentScript, "name", this._scripts).name("Script");
            this._edit.add(this._currentScript, "active").name("Active");
        }

        // Bind the events
        private _bindEvents(): void {
            this._editor.element.onDidChangeModelContent(() => {
                if (this._currentNode) {
                    debugger;
                    this._currentScript.code = this._editor.element.getValue();

                    //var ext = new EXTENSIONS.BehaviorExtension(this._core.currentScene);
                    //ext.apply(null);
                }
            });
        }
    }
}
