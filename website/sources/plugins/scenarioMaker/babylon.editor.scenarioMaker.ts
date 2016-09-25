module BABYLON.EDITOR {
    interface IEntry {
        name?: string;
        fileName?: string;
        documentation?: string;
        type?: string;

        classes?: IEntry[];
        constructors?: IEntry[];

        functions?: IEntry[];
        functionBody?: IEntry[];

        parameters?: IEntry[];
        properties?: IEntry[];

        entryType?: string;
        moduleName?: string;
    };

    export class ScenarioMaker {
        // Public members

        // Private members
        private _core: EditorCore;

        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _modulesGraph: GUI.GUIGraph = null;

        // Static members
        private static _Definitions: IEntry[] = null;

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore) {
            this._core = core;

            // Load file
            if (!ScenarioMaker._Definitions)
                BABYLON.Tools.LoadFile("website/resources/classes.min.json", (data: any) => this._parseFile(data), null, null, false);
            else
                this._createUI();
        }

        /**
        * Parses the babylon file
        */
        private _parseFile(data: string): void {
            var entries: IEntry[] = JSON.parse(data);
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].name != "BABYLON")
                    entries.splice(i, 1);
            }

            ScenarioMaker._Definitions = entries;
            this._createUI();
        }

        /**
        * Creates the UI
        */
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Scenario Maker", this._containerID, true);

            // Create layout
            this._layouts = new GUI.GUILayout(this._containerID, this._core);

            this._layouts.createPanel("SCENARIO-MAKER-MODULES", "left", 300, true).setContent("<div id=\"SCENARIO-MAKER-MODULES\" style=\"width: 100%; height: 100%;\"></div>");

            var mainPanel = this._layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"SCENARIO-MAKER-CANVAS\" style=\"height: 100%; width: 100%; position: absolute;\"></div>");
            mainPanel.style = "overflow: hidden;";

            this._layouts.buildElement(this._containerID);

            // Create Modules graph
            this._modulesGraph = new GUI.GUIGraph("SCENARIO-MAKER-MODULES", this._core);
            this._modulesGraph.buildElement("SCENARIO-MAKER-MODULES");

            var modules: { [name: string]: GUI.IGraphNodeElement } = { };

            var fillModules = (entries: IEntry[], parent: GUI.IGraphNodeElement) => {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var graphElement = modules[entry.name];

                    if (!graphElement) {
                        graphElement = this._modulesGraph.createNode(SceneFactory.GenerateUUID(), entry.name, "icon-save", entry);
                        this._modulesGraph.addNodes(graphElement, parent ? parent.id : null);
                    }

                    if (entry.entryType === "module") {
                        //fillModules(entry.classes, graphElement);
                    }

                    modules[entry.name] = graphElement;
                }
            }

            fillModules(ScenarioMaker._Definitions, null);
        }
    }
}