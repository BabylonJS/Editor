module BABYLON.EDITOR {
    interface IElementItem extends GUI.IGridRowData {
        name: string;
    }

    export class ActionsBuilder implements IEventReceiver, ITabApplication {
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

        private _graph: ActionsBuilderGraph = null;

        private _currentSelected: {id?: string, list?: GUI.GUIGrid<IElementItem> } = null;

        // Static members
        private static _Classes: IDocEntry[] = null;

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;
            core.eventReceivers.push(this);

            // Create UI
            this._createUI();

            if (!ActionsBuilder._Classes)
                this._loadDefinitionsFile();
            else
                this._configureUI();
        }

        // On event
        public onEvent(event: IEvent): boolean {
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.DOCUMENT_UNCLICK) {
                var mouseEvent: MouseEvent = <any>event.guiEvent.data;
                var caller = $(mouseEvent.target);

                // Until I find how to get the working canvas of cytoscape
                if (caller.parent() && caller.parent().parent()) {
                    if (caller.parent().parent()[0] !== this._graph.canvasElement[0])
                        this._currentSelected = null;
                    else {
                        this._graph.setMousePosition(mouseEvent.offsetX, mouseEvent.offsetY);
                    }
                }

                return false;
            }

            return false;
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._triggersList.destroy();
            this._actionsList.destroy();
            this._controlsList.destroy();
            this._layouts.destroy();
        }

        /**
        * Creates the UI
        */
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Actions Builder", this._containerID, this, true);

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
            this._triggersList.createColumn("name", "name", "100%");
            this._triggersList.onMouseDown = () => this._onListElementClicked(this._triggersList);
            this._triggersList.buildElement("ACTIONS-BUILDER-TRIGGERS");

            // Create actions list
            this._actionsList = new GUI.GUIGrid<IElementItem>("ACTIONS-BUILDER-ACTIONS", this._core);
            this._actionsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
            this._actionsList.header = "Actions";
            this._actionsList.fixedBody = true;
            this._actionsList.multiSelect = false;
            this._actionsList.createColumn("name", "name", "100%");
            this._actionsList.onMouseDown = () => this._onListElementClicked(this._actionsList);
            this._actionsList.buildElement("ACTIONS-BUILDER-ACTIONS");

            // Create controls list
            this._controlsList = new GUI.GUIGrid<IElementItem>("ACTIONS-BUILDER-CONTROLS", this._core);
            this._controlsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
            this._controlsList.header = "Controls";
            this._controlsList.fixedBody = true;
            this._controlsList.multiSelect = false;
            this._controlsList.createColumn("name", "name", "100%");
            this._controlsList.onMouseDown = () => this._onListElementClicked(this._controlsList);
            this._controlsList.buildElement("ACTIONS-BUILDER-CONTROLS");

            // Create graph
            this._graph = new ActionsBuilderGraph(this._core);
            this._graph.onMouseUp = () => this._onMouseUpOnGraph();
        }

        // Fills the lists on the left (triggers, actions and controls)
        private _configureUI(): void {
            // Triggers
            for (var i = ActionManager.NothingTrigger; i < ActionManager.OnKeyUpTrigger; i++) {
                this._triggersList.addRecord(<IElementItem>{ recid: i, name: ActionManager.GetTriggerName(i), style: "background-color: rgb(133, 154, 185)" });
            }

            this._triggersList.refresh();

            // Actions
            var actionsClasses = this._getClasses(this._babylonModule, "BABYLON.Action");
            for (var i = 0; i < actionsClasses.length; i++) {
                this._actionsList.addRecord(<IElementItem>{ recid: i, name: actionsClasses[i].name, style: "background-color: rgb(182, 185, 132)" });
            }

            this._actionsList.refresh();

            // Controls
            var controlClasses = this._getClasses(this._babylonModule, "BABYLON.Condition");
            for (var i = 0; i < controlClasses.length; i++) {
                this._controlsList.addRecord({ recid: i, name: controlClasses[i].name, style: "background-color: rgb(185, 132, 140)" });
            }

            this._controlsList.refresh();

            // Graph
            this._graph.createGraph("ACTIONS-BUILDER-CANVAS");
        }

        // When a list element is clicked
        private _onListElementClicked(list: GUI.GUIGrid<IElementItem>): void {
            var selected = list.getSelectedRows();

            if (selected.length) {
                this._currentSelected = { id: list.getRow(selected[0]).name, list: list };
            }
        }

        // When the user unclicks on the graph
        private _onMouseUpOnGraph(): void {
            if (this._currentSelected) {
                var color = "rgb(133, 154, 185)"; // Trigger as default

                if (this._currentSelected.list === this._actionsList)
                    color = "rgb(182, 185, 132)";
                else if (this._currentSelected.list === this._controlsList)
                    color = "rgb(185, 132, 140)";

                this._graph.addNode(this._currentSelected.id, this._currentSelected.id, color);
                this._currentSelected = null;
            }
        }

        // Loads the definitions file which contains definitions of the Babylon.js framework
        // defined in a more simple JSON format
        private _loadDefinitionsFile(): void {
            this._layouts.lockPanel("main", "Loading...", true);

            BABYLON.Tools.LoadFile("website/resources/classes.min.json", (data: string) => {
                ActionsBuilder._Classes = JSON.parse(data);
                this._babylonModule = this._getModule("BABYLON");
                this._configureUI();

                this._layouts.unlockPanel("main");
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

        // Returns the classes of the the given module
        // Only classes that heritages "heritates"'s value ?
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