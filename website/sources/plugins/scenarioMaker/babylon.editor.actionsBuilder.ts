module BABYLON.EDITOR {
    interface IElementItem extends GUI.IGridRowData {
        name: string;
    }

    interface IDocEntry {
        name?: string;
        fileName?: string;
        documentation?: string;
        type?: string;

        classes?: IDocEntry[];
        constructors?: IDocEntry[];

        functions?: IDocEntry[];
        functionBody?: IDocEntry[];

        parameters?: IDocEntry[];
        properties?: IDocEntry[];

        entryType?: string;
        moduleName?: string;

        heritageClauses?: string[];
    };

    export class ActionsBuilder {
        // Public members

        // Private members
        private _core: EditorCore;

        private _babylonModule: IDocEntry = null;

        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _triggersList: GUI.GUIGrid<IElementItem> = null;
        private _actionsList: GUI.GUIGrid<IElementItem> = null;
        private _controlsList: GUI.GUIGrid<IElementItem> = null;

        // Static members
        private static _Classes: IDocEntry[] = null;

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore) {
            this._core = core;

            // Create UI
            if (!ActionsBuilder._Classes)
                this._loadDefinitionsFile();
            else
                this._createUI();
        }

        /**
        * Creates the UI
        */
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Actions Builder", this._containerID, true);

            // Create layout
            this._layouts = new GUI.GUILayout(this._containerID, this._core);

            this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 300, true).setContent(
                "<div id=\"ACTIONS-BUILDER-TRIGGERS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                "<div id=\"ACTIONS-BUILDER-ACTIONS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                "<div id=\"ACTIONS-BUILDER-CONTROLS\" style=\"width: 100%; height: 33.33%;\"></div>"
            );

            var mainPanel = this._layouts.createPanel("ACTIONS-BUILDER-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"ACTIONS-BUILDER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
            mainPanel.style = "overflow: hidden;";

            this._layouts.buildElement(this._containerID);

            // Create triggers list
            this._triggersList = new GUI.GUIGrid<IElementItem>("ACTIONS-BUILDER-TRIGGERS", this._core);
            this._triggersList.showAdd = this._triggersList.showEdit = this._triggersList.showOptions = this._triggersList.showRefresh = false;
            this._triggersList.header = "Triggers";
            this._triggersList.fixedBody = true;
            this._triggersList.multiSelect = false;
            this._triggersList.createColumn("name", "name", "100%");
            this._triggersList.buildElement("ACTIONS-BUILDER-TRIGGERS");

            for (var i = ActionManager.NothingTrigger; i < ActionManager.OnKeyUpTrigger; i++) {
                this._triggersList.addRecord({ recid: i, name: ActionManager.GetTriggerName(i) });
            }

            this._triggersList.refresh();

            // Create actions list
            this._actionsList = new GUI.GUIGrid<IElementItem>("ACTIONS-BUILDER-ACTIONS", this._core);
            this._actionsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
            this._actionsList.header = "Actions";
            this._actionsList.fixedBody = true;
            this._actionsList.multiSelect = false;
            this._actionsList.createColumn("name", "name", "100%");
            this._actionsList.buildElement("ACTIONS-BUILDER-ACTIONS");

            var actionsClasses = this._getClasses(this._babylonModule, "BABYLON.Action");
            for (var i = 0; i < actionsClasses.length; i++) {
                this._actionsList.addRecord({ recid: i, name: actionsClasses[i].name });
            }

            this._actionsList.refresh();

            // Create controls list
            this._controlsList = new GUI.GUIGrid<IElementItem>("ACTIONS-BUILDER-CONTROLS", this._core);
            this._controlsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
            this._controlsList.header = "Controls";
            this._controlsList.fixedBody = true;
            this._controlsList.multiSelect = false;
            this._controlsList.createColumn("name", "name", "100%");
            this._controlsList.buildElement("ACTIONS-BUILDER-CONTROLS");
            
            var controlClasses = this._getClasses(this._babylonModule, "BABYLON.Condition");
            for (var i = 0; i < controlClasses.length; i++) {
                this._controlsList.addRecord({ recid: i, name: controlClasses[i].name });
            }

            this._controlsList.refresh();
        }

        // Loads the definitions file which contains definitions of the Babylon.js framework
        // defined in a more simple JSON format
        private _loadDefinitionsFile(): void {
            BABYLON.Tools.LoadFile("website/resources/classes.min.json", (data: string) => {
                ActionsBuilder._Classes = JSON.parse(data);
                this._babylonModule = this._getModule("BABYLON");
                this._createUI();
            });
        }

        // Returns a module of the definitions file
        private _getModule(name: string): IDocEntry {
            for (var i = 0; i < ActionsBuilder._Classes.length; i++) {
                var module = ActionsBuilder._Classes[i];

                if (module && module.name === name)
                    return module;
            }

            return null;
        }

        private _getClasses(module: IDocEntry, heritates?: string): IDocEntry[] {
            var classes: IDocEntry[] = [];

            for (var i = 0; i < module.classes.length; i++) {
                var currentClass = module.classes[i];

                if (heritates) {
                    if (!currentClass.heritageClauses || !currentClass.heritageClauses.some((value: string) => value === heritates))
                        continue;
                }

                classes.push(currentClass);
            }

            return classes;
        }
    }
}