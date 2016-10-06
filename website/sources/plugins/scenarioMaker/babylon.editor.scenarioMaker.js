var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        ;
        var ActionsBuilder = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ActionsBuilder(core) {
                this._babylonModule = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._triggersList = null;
                this._actionsList = null;
                this._controlsList = null;
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
            ActionsBuilder.prototype._createUI = function () {
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Actions Builder", this._containerID, true);
                // Create layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 300, true).setContent("<div id=\"ACTIONS-BUILDER-TRIGGERS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                    "<div id=\"ACTIONS-BUILDER-ACTIONS\" style=\"width: 100%; height: 33.33%;\"></div>" +
                    "<div id=\"ACTIONS-BUILDER-CONTROLS\" style=\"width: 100%; height: 33.33%;\"></div>");
                var mainPanel = this._layouts.createPanel("ACTIONS-BUILDER-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"ACTIONS-BUILDER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this._layouts.buildElement(this._containerID);
                // Create triggers list
                this._triggersList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-TRIGGERS", this._core);
                this._triggersList.showAdd = this._triggersList.showEdit = this._triggersList.showOptions = this._triggersList.showRefresh = false;
                this._triggersList.header = "Triggers";
                this._triggersList.fixedBody = true;
                this._triggersList.createColumn("name", "name", "100%");
                this._triggersList.buildElement("ACTIONS-BUILDER-TRIGGERS");
                for (var i = BABYLON.ActionManager.NothingTrigger; i < BABYLON.ActionManager.OnKeyUpTrigger; i++) {
                    this._triggersList.addRecord({ recid: i, name: BABYLON.ActionManager.GetTriggerName(i) });
                }
                this._triggersList.refresh();
                // Create actions list
                this._actionsList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-ACTIONS", this._core);
                this._actionsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
                this._actionsList.header = "Actions";
                this._actionsList.fixedBody = true;
                this._actionsList.createColumn("name", "name", "100%");
                this._actionsList.buildElement("ACTIONS-BUILDER-ACTIONS");
                var actionsClasses = this._getClasses(this._babylonModule, "BABYLON.Action");
                for (var i = 0; i < actionsClasses.length; i++) {
                    this._actionsList.addRecord({ recid: i, name: actionsClasses[i].name });
                }
                this._actionsList.refresh();
                // Create controls list
                this._controlsList = new EDITOR.GUI.GUIGrid("ACTIONS-BUILDER-CONTROLS", this._core);
                this._controlsList.showAdd = this._actionsList.showEdit = this._actionsList.showOptions = this._actionsList.showRefresh = false;
                this._controlsList.header = "Controls";
                this._controlsList.fixedBody = true;
                this._controlsList.createColumn("name", "name", "100%");
                this._controlsList.buildElement("ACTIONS-BUILDER-CONTROLS");
                var controlClasses = this._getClasses(this._babylonModule, "BABYLON.Condition");
                for (var i = 0; i < controlClasses.length; i++) {
                    this._controlsList.addRecord({ recid: i, name: controlClasses[i].name });
                }
                this._controlsList.refresh();
            };
            // Loads the definitions file which contains definitions of the Babylon.js framework
            // defined in a more simple JSON format
            ActionsBuilder.prototype._loadDefinitionsFile = function () {
                var _this = this;
                BABYLON.Tools.LoadFile("website/resources/classes.min.json", function (data) {
                    ActionsBuilder._Classes = JSON.parse(data);
                    _this._babylonModule = _this._getModule("BABYLON");
                    _this._createUI();
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
            // Static members
            ActionsBuilder._Classes = null;
            return ActionsBuilder;
        }());
        EDITOR.ActionsBuilder = ActionsBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.scenarioMaker.js.map