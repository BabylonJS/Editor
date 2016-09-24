var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        ;
        var ScenarioMaker = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ScenarioMaker(core) {
                var _this = this;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._modulesGraph = null;
                this._core = core;
                // Load file
                if (!ScenarioMaker._Definitions)
                    BABYLON.Tools.LoadFile("website/resources/classes.min.json", function (data) { return _this._parseFile(data); }, null, null, false);
                else
                    this._createUI();
            }
            /**
            * Parses the babylon file
            */
            ScenarioMaker.prototype._parseFile = function (data) {
                var entries = JSON.parse(data);
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].name != "BABYLON")
                        entries.splice(i, 1);
                }
                ScenarioMaker._Definitions = entries;
                this._createUI();
            };
            /**
            * Creates the UI
            */
            ScenarioMaker.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Scenario Maker", this._containerID, true);
                // Create layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 300, true).setContent("<div id=\"SCENARIO-MAKER-MODULES\" style=\"width: 100%; height: 100%;\"></div>");
                var mainPanel = this._layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"SCENARIO-MAKER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this._layouts.buildElement(this._containerID);
                // Create Modules graph
                this._modulesGraph = new EDITOR.GUI.GUIGraph("SCENARIO-MAKER-MODULES", this._core);
                this._modulesGraph.buildElement("SCENARIO-MAKER-MODULES");
                var modules = {};
                var fillModules = function (entries, parent) {
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var graphElement = modules[entry.name];
                        if (!graphElement) {
                            graphElement = _this._modulesGraph.createNode(EDITOR.SceneFactory.GenerateUUID(), entry.name, "icon-save", entry);
                            _this._modulesGraph.addNodes(graphElement, parent ? parent.id : null);
                        }
                        if (entry.entryType === "module") {
                        }
                        modules[entry.name] = graphElement;
                    }
                };
                fillModules(ScenarioMaker._Definitions, null);
            };
            // Static members
            ScenarioMaker._Definitions = null;
            return ScenarioMaker;
        }());
        EDITOR.ScenarioMaker = ScenarioMaker;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
