var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        (function (EACTION_TYPE) {
            EACTION_TYPE[EACTION_TYPE["TRIGGER"] = 0] = "TRIGGER";
            EACTION_TYPE[EACTION_TYPE["ACTION"] = 1] = "ACTION";
            EACTION_TYPE[EACTION_TYPE["CONTROL"] = 2] = "CONTROL";
        })(EDITOR.EACTION_TYPE || (EDITOR.EACTION_TYPE = {}));
        var EACTION_TYPE = EDITOR.EACTION_TYPE;
        var ActionsBuilder = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ActionsBuilder(core) {
                this._babylonModule = null;
                this._actionsClasses = null;
                this._controlsClasses = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._triggersList = null;
                this._actionsList = null;
                this._controlsList = null;
                this._graph = null;
                this._currentSelected = null;
                this._parametersEditor = null;
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
            ActionsBuilder.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.DOCUMENT_UNCLICK) {
                    var mouseEvent = event.guiEvent.data;
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
                else if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    this._object = event.sceneEvent.object;
                    if (ActionsBuilder._Classes) {
                        this._graph.clear();
                    }
                }
                return false;
            };
            /**
            * Disposes the application
            */
            ActionsBuilder.prototype.dispose = function () {
                this._triggersList.destroy();
                this._actionsList.destroy();
                this._controlsList.destroy();
                this._layouts.destroy();
            };
            /**
            * Creates the UI
            */
            ActionsBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Actions Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Create layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 300, true).setContent("<div id=\"ACTIONS-BUILDER-TRIGGERS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                    "<div id=\"ACTIONS-BUILDER-ACTIONS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                    "<div id=\"ACTIONS-BUILDER-CONTROLS\" style=\"width: 100%; height: 33.33%;\"></div>");
                var mainPanel = this._layouts.createPanel("ACTIONS-BUILDER-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"ACTIONS-BUILDER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this._layouts.createPanel("ACTIONS-BUILDER-RIGHT-PANEL", "right", 200, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "ACTIONS-BUILDER-EDIT"));
                this._layouts.buildElement(this._containerID);
                // Create triggers list
                this._triggersList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-TRIGGERS", this._core);
                this._triggersList.showAdd = this._triggersList.showEdit = this._triggersList.showOptions = this._triggersList.showRefresh = false;
                this._triggersList.header = "Triggers";
                this._triggersList.fixedBody = true;
                this._triggersList.createColumn("name", "name", "100%");
                this._triggersList.onMouseDown = function () { return _this._onListElementClicked(_this._triggersList); };
                this._triggersList.buildElement("ACTIONS-BUILDER-TRIGGERS");
                // Create actions list
                this._actionsList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-ACTIONS", this._core);
                this._actionsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
                this._actionsList.header = "Actions";
                this._actionsList.fixedBody = true;
                this._actionsList.multiSelect = false;
                this._actionsList.createColumn("name", "name", "100%");
                this._actionsList.onMouseDown = function () { return _this._onListElementClicked(_this._actionsList); };
                this._actionsList.buildElement("ACTIONS-BUILDER-ACTIONS");
                // Create controls list
                this._controlsList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-CONTROLS", this._core);
                this._controlsList.showAdd = this._controlsList.showEdit = this._controlsList.showOptions = this._controlsList.showRefresh = false;
                this._controlsList.header = "Controls";
                this._controlsList.fixedBody = true;
                this._controlsList.multiSelect = false;
                this._controlsList.createColumn("name", "name", "100%");
                this._controlsList.onMouseDown = function () { return _this._onListElementClicked(_this._controlsList); };
                this._controlsList.buildElement("ACTIONS-BUILDER-CONTROLS");
                // Create graph
                this._graph = new EDITOR.ActionsBuilderGraph(this._core);
                this._graph.onMouseUp = function () { return _this._onMouseUpOnGraph(); };
                // Create parameters
                this._parametersEditor = new EDITOR.ActionsBuilderParametersEditor(this._core, "ACTIONS-BUILDER-EDIT");
            };
            // Fills the lists on the left (triggers, actions and controls)
            ActionsBuilder.prototype._configureUI = function () {
                // Triggers
                for (var i = BABYLON.ActionManager.NothingTrigger; i < BABYLON.ActionManager.OnKeyUpTrigger; i++) {
                    this._triggersList.addRecord({ recid: i, name: BABYLON.ActionManager.GetTriggerName(i), style: "background-color: rgb(133, 154, 185)" });
                }
                this._triggersList.refresh();
                // Actions
                this._actionsClasses = this._getClasses(this._babylonModule, "BABYLON.Action");
                for (var i = 0; i < this._actionsClasses.length; i++) {
                    this._actionsList.addRecord({ recid: i, name: this._actionsClasses[i].name, style: "background-color: rgb(182, 185, 132)" });
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
            };
            // When a list element is clicked
            ActionsBuilder.prototype._onListElementClicked = function (list) {
                var selected = list.getSelectedRows();
                this._containerElement.css("cursor", "copy");
                if (selected.length) {
                    this._currentSelected = { id: list.getRow(selected[0]).name, list: list };
                }
            };
            // When the user unclicks on the graph
            ActionsBuilder.prototype._onMouseUpOnGraph = function () {
                this._containerElement.css("cursor", "default");
                if (this._currentSelected) {
                    // Get target type and choose if add node or not
                    var color = "rgb(133, 154, 185)"; // Trigger as default
                    var type = "trigger"; // Trigger as default
                    var data = {
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
                    this._graph.addNode(this._currentSelected.id, this._currentSelected.id, color, type, data);
                    this._currentSelected = null;
                }
                else {
                    var target = this._graph.getTargetNodeId();
                    if (!target)
                        return;
                    var data = this._graph.getNodeData(target);
                    this._parametersEditor.drawProperties(data, this._object);
                }
            };
            // Configures the actions builder data property
            // used by actions serializer / deserializer
            ActionsBuilder.prototype._configureActionsBuilderData = function (data, type) {
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
                    var property = {
                        name: param.name,
                        value: ""
                    };
                    if (param.name === "triggerOptions" || param.name === "condition" || allowedTypes.indexOf(param.type) === -1)
                        continue;
                    if (param.name === "target") {
                        property.targetType = "MeshProperties";
                        property.value = this._core.currentScene.meshes.length > 0 ? this._core.currentScene.meshes[0].name : "";
                    }
                    data.data.properties.push(property);
                }
            };
            // Loads the definitions file which contains definitions of the Babylon.js framework
            // defined in a more simple JSON format
            ActionsBuilder.prototype._loadDefinitionsFile = function () {
                var _this = this;
                this._layouts.lockPanel("main", "Loading...", true);
                BABYLON.Tools.LoadFile("website/resources/classes.min.json", function (data) {
                    ActionsBuilder._Classes = JSON.parse(data);
                    _this._babylonModule = _this._getModule("BABYLON");
                    _this._configureUI();
                    _this._layouts.unlockPanel("main");
                });
            };
            // Returns a module of the definitions file
            ActionsBuilder.prototype._getModule = function (name) {
                for (var i = 0; i < ActionsBuilder._Classes.length; i++) {
                    var module = ActionsBuilder._Classes[i];
                    if (module && module.name === name)
                        return module;
                }
                return null;
            };
            // Returns the classes of the the given module
            // Only classes that heritages "heritates"'s value ?
            ActionsBuilder.prototype._getClasses = function (module, heritates) {
                var classes = [];
                for (var i = 0; i < module.classes.length; i++) {
                    var currentClass = module.classes[i];
                    if (heritates) {
                        if (!currentClass.heritageClauses || !currentClass.heritageClauses.some(function (value) { return value === heritates; }))
                            continue;
                    }
                    classes.push(currentClass);
                }
                return classes;
            };
            // Returns the class which has the given name
            ActionsBuilder.prototype._getClass = function (classes, name) {
                for (var i = 0; i < classes.length; i++) {
                    if (classes[i].name === name)
                        return classes[i];
                }
                return null;
            };
            // Static members
            ActionsBuilder._Classes = null;
            return ActionsBuilder;
        }());
        EDITOR.ActionsBuilder = ActionsBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
