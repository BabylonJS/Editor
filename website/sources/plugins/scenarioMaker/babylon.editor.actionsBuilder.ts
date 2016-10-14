module BABYLON.EDITOR {
    interface IElementItem extends GUI.IGridRowData {
        name: string;
    }

    export interface IActionsBuilderProperty {
        name: string;
        value: string;
        targetType?: string;
    }

    export interface IActionsBuilderElement {
        type: number;
        name: string;
        properties: IActionsBuilderProperty[];
    }

    export interface IActionsBuilderSerializationObject extends IActionsBuilderElement {
        children: IActionsBuilderSerializationObject[];
    }

    export interface IActionsBuilderData {
        class: IDocEntry;
        data: IActionsBuilderElement;
    }

    export enum EACTION_TYPE {
        TRIGGER = 0,
        ACTION = 1,
        CONTROL = 2
    }

    export class ActionsBuilder implements IEventReceiver, ITabApplication {
        // Public members

        // Private members
        private _core: EditorCore;
        private _object: AbstractMesh | Scene;

        private _babylonModule: IDocEntry = null;
        private _actionsClasses: IDocEntry[] = null;
        private _controlsClasses: IDocEntry[] = null;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _triggersList: GUI.GUIGrid<IElementItem> = null;
        private _actionsList: GUI.GUIGrid<IElementItem> = null;
        private _controlsList: GUI.GUIGrid<IElementItem> = null;

        private _graph: ActionsBuilderGraph = null;

        private _currentSelected: { id?: string, list?: GUI.GUIGrid<IElementItem> } = null;

        private _parametersEditor: ActionsBuilderParametersEditor = null;

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

                this._containerElement.css("cursor", "default");

                return false;
            }

            else if (event.eventType === EventType.SCENE_EVENT && event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                this._object = event.sceneEvent.object;
                this._onObjectSelected();
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
        * Serializes the graph
        */
        public serializeGraph(root?: IActionsBuilderSerializationObject, parent?: string): IActionsBuilderSerializationObject {
            if (!root) {
                root = {
                    name: this._object instanceof Scene ? "Scene" : (<AbstractMesh>this._object).name,
                    type: this._object instanceof Scene ? 3 : 4,
                    properties: [],
                    children: []
                };
            }

            var nodes = parent ? this._graph.getNodesWithParent(parent) : this._graph.getRootNodes();
            
            for (var i = 0; i < nodes.length; i++) {
                var data: IActionsBuilderSerializationObject = this._graph.getNodeData(nodes[i]).data;
                var childData: IActionsBuilderSerializationObject = {
                    name: data.name,
                    type: data.type,
                    properties: data.properties,
                    children: []
                };

                this.serializeGraph(childData, nodes[i]);

                root.children.push(childData);
            }

            return root;
        }

        /**
        * Deserializes the graph
        */
        public deserializeGraph(data: IActionsBuilderSerializationObject, parent: string): void {
            for (var i = 0; i < data.children.length; i++) {
                var child = data.children[i];

                if (child.type === EACTION_TYPE.TRIGGER && child.children.length === 0)
                    continue;

                var childData: IActionsBuilderSerializationObject = {
                    name: child.name,
                    type: child.type,
                    properties: child.properties,
                    children: []
                };

                var nodeData: IActionsBuilderData = {
                    class: this._getNodeParametersClass(childData.type, childData.name),
                    data: childData
                };

                var childNode = this._graph.addNode(child.name, child.name, this._getNodeColor(child.type), this._getNodeTypeString(child.type), parent, nodeData);

                this.deserializeGraph(child, childNode);
            }
        }

        /**
        * Creates the UI
        */
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Actions Builder", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Create layout
            this._layouts = new GUI.GUILayout(this._containerID, this._core);

            this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 300, true).setContent(
                "<div id=\"ACTIONS-BUILDER-TRIGGERS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                "<div id=\"ACTIONS-BUILDER-ACTIONS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                "<div id=\"ACTIONS-BUILDER-CONTROLS\" style=\"width: 100%; height: 33.33%;\"></div>"
            );

            var mainPanel = this._layouts.createPanel("ACTIONS-BUILDER-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"ACTIONS-BUILDER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
            mainPanel.style = "overflow: hidden;";

            this._layouts.createPanel("ACTIONS-BUILDER-RIGHT-PANEL", "right", 200, true).setContent(GUI.GUIElement.CreateElement("div", "ACTIONS-BUILDER-EDIT"));

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
            this._controlsList.showAdd = this._controlsList.showEdit = this._controlsList.showOptions = this._controlsList.showRefresh = false;
            this._controlsList.header = "Controls";
            this._controlsList.fixedBody = true;
            this._controlsList.multiSelect = false;
            this._controlsList.createColumn("name", "name", "100%");
            this._controlsList.onMouseDown = () => this._onListElementClicked(this._controlsList);
            this._controlsList.buildElement("ACTIONS-BUILDER-CONTROLS");

            // Create graph
            this._graph = new ActionsBuilderGraph(this._core);
            this._graph.onMouseUp = () => this._onMouseUpOnGraph();

            // Create parameters
            this._parametersEditor = new ActionsBuilderParametersEditor(this._core, "ACTIONS-BUILDER-EDIT");
            this._parametersEditor.onSave = () => this._onSave();
        }

        // Fills the lists on the left (triggers, actions and controls)
        private _configureUI(): void {
            // Triggers
            for (var i = ActionManager.NothingTrigger; i < ActionManager.OnKeyUpTrigger; i++) {
                this._triggersList.addRecord(<IElementItem>{ recid: i, name: ActionManager.GetTriggerName(i), style: "background-color: rgb(133, 154, 185)" });
            }

            this._triggersList.refresh();

            // Actions
            this._actionsClasses = this._getClasses(this._babylonModule, "BABYLON.Action");
            for (var i = 0; i < this._actionsClasses.length; i++) {
                this._actionsList.addRecord(<IElementItem>{ recid: i, name: this._actionsClasses[i].name, style: "background-color: rgb(182, 185, 132)" });
            }

            this._actionsList.refresh();

            // Controls
            this._controlsClasses = this._getClasses(this._babylonModule, "BABYLON.Condition");
            for (var i = 0; i < this._controlsClasses.length; i++) {
                this._controlsList.addRecord({ recid: i, name: this._controlsClasses[i].name, style: "background-color: rgb(185, 132, 140)" });
            }

            this._controlsList.refresh();

            // Graph
            this._graph.createGraph("ACTIONS-BUILDER-CANVAS");
        }

        // When the user selects an object, configure the graph
        private _onObjectSelected(): void {
            if (!ActionsBuilder._Classes)
                return;
            
            var actionManager: ActionManager = null;

            this._graph.clear();

            if (this._object instanceof Scene)
                actionManager = this._core.isPlaying ? this._object.actionManager : SceneManager._SceneConfiguration.actionManager;
            else
                actionManager = this._core.isPlaying ? this._object.actionManager : SceneManager._ConfiguredObjectsIDs[(<AbstractMesh>this._object).id].actionManager;

            if (!actionManager) {
                debugger;
                return;
            }
            
            this.deserializeGraph(actionManager.serialize(this._object instanceof Scene ? "Scene" : (<AbstractMesh>this._object).name), "");
            this._graph.layout();
        }

        // When the user saves the graph
        private _onSave(): void {
            var graph = this.serializeGraph();
            ActionManager.Parse(graph, <AbstractMesh>this._object, this._core.currentScene);
        }

        // When a list element is clicked
        private _onListElementClicked(list: GUI.GUIGrid<IElementItem>): void {
            var selected = list.getSelectedRows();
            this._containerElement.css("cursor", "copy");

            if (selected.length) {
                this._currentSelected = { id: list.getRow(selected[0]).name, list: list };
            }
        }

        // Returns the node class parameters for the given type
        private _getNodeParametersClass(type: EACTION_TYPE, name: string): IDocEntry {
            if (type === EACTION_TYPE.ACTION)
                return this._getClass(this._actionsClasses, name);
            else if (type === EACTION_TYPE.CONTROL)
                return this._getClass(this._controlsClasses, name);

            return null;
        }

        // Returns the node color for the given type
        private _getNodeColor(type: EACTION_TYPE): string {
            var color = "rgb(133, 154, 185)"; // Trigger as default

            if (type === EACTION_TYPE.ACTION)
                return "rgb(182, 185, 132)";
            else if (type === EACTION_TYPE.CONTROL)
                return "rgb(185, 132, 140)";

            return color;
        }

        // Returns the node's type string from type
        private _getNodeTypeString(type: EACTION_TYPE): string {
            var typeStr = "trigger"; // Trigger as default

            if (type === EACTION_TYPE.ACTION)
                return "action";
            else if (type === EACTION_TYPE.CONTROL)
                return "control";

            return typeStr;
        }

        // When the user unclicks on the graph
        private _onMouseUpOnGraph(): void {
            this._containerElement.css("cursor", "default");

            if (this._currentSelected) {
                // Get target type and choose if add node or not
                var color = "rgb(133, 154, 185)"; // Trigger as default
                var type = "trigger"; // Trigger as default
                var data: IActionsBuilderData = {
                    class: null,
                    data: { name: this._currentSelected.id, properties: [], type: 0 /*Trigger as default*/ }
                };

                if (this._currentSelected.list === this._actionsList) {
                    color = "rgb(182, 185, 132)";
                    type = "action";
                    data.class = this._getClass(this._actionsClasses, this._currentSelected.id);
                    this._configureActionsBuilderData(data, EACTION_TYPE.ACTION);
                }
                else if (this._currentSelected.list === this._controlsList) {
                    color = "rgb(185, 132, 140)";
                    type = "control";
                    data.class = this._getClass(this._controlsClasses, this._currentSelected.id);
                    this._configureActionsBuilderData(data, EACTION_TYPE.CONTROL);
                }

                // Check target type
                var targetType = this._graph.getTargetNodeType();
                if (type === "trigger" && targetType !== null || type !== "trigger" && targetType === null) {
                    this._currentSelected = null;
                    return;
                }

                // Finally, add node and configure it
                this._graph.addNode(this._currentSelected.id, this._currentSelected.id, color, type, null, data);
                this._currentSelected = null;
            }
            else {
                var target = this._graph.getTargetNodeId();
                if (!target)
                    return;

                var data = <IActionsBuilderData>this._graph.getNodeData(target);
                this._parametersEditor.drawProperties(data);

                var serialziedValue = this.serializeGraph();
            }
        }

        // Configures the actions builder data property
        // used by actions serializer / deserializer
        private _configureActionsBuilderData(data: IActionsBuilderData, type: EACTION_TYPE): any {
            /*
            Example of serialized value:

            "actions": {
		        "children": [
			        {
				        "type": 0,
				        "children": [
					        {
						        "type": 1,
						        "children": [],
						        "name": "InterpolateValueAction",
						        "properties": [
							        {
								        "name": "target",
								        "targetType": "MeshProperties",
								        "value": "sphereGlass"
							        },
							        {
								        "name": "propertyPath",
								        "value": "position"
							        },
							        {
								        "name": "value",
								        "value": "0, 0, 0"
							        },
							        {
								        "name": "duration",
								        "value": "1000"
							        },
							        {
								        "name": "stopOtherAnimations",
								        "value": "false"
							        }
						        ]
					        }
				        ],
				        "name": "OnEveryFrameTrigger",
				        "properties": []
			        }
		        ],
		        "name": "Scene",
		        "type": 3,
		        "properties": []
	        }
            */
            data.data.type = type;

            var constructor = data.class.constructors[0];
            var allowedTypes = ["number", "string", "boolean", "any", "Vector3", "Vector2", "Sound"];

            for (var i = 0; i < constructor.parameters.length; i++) {
                var param = constructor.parameters[i];
                var property: IActionsBuilderProperty = {
                    name: param.name,
                    value: null
                };

                if (param.name === "triggerOptions" || param.name === "condition" || allowedTypes.indexOf(param.type) === -1)
                    continue;

                if (param.name === "target") {
                    property.targetType = "MeshProperties";
                    property.value = this._core.currentScene.meshes.length > 0 ? this._core.currentScene.meshes[0].name : "";
                }

                data.data.properties.push(property);
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

        // Returns the class which has the given name
        private _getClass(classes: IDocEntry[], name: string): IDocEntry {
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].name === name)
                    return classes[i];
            }

            return null;
        }
    }
}