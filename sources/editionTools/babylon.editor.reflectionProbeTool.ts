module BABYLON.EDITOR {
    interface IReflectionProbeRow extends GUI.IGridRowData {
        name: string;
    }

    export class ReflectionProbeTool extends AbstractDatTool implements IEventReceiver {
        // Public members
        public object: Node = null;

        public tab: string = "REFLECTION.PROBE.TAB";

        // Private members
        private _window: GUI.GUIWindow = null;
        private _excludedMeshesList: GUI.GUIGrid<IReflectionProbeRow> = null;
        private _includedMeshesList: GUI.GUIGrid<IReflectionProbeRow> = null;

        private _layouts: GUI.GUILayout = null;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-REFLECTION-PROBE"
            ];

            this._editionTool.core.eventReceivers.push(this);
        }

        // On event
        public onEvent(event: Event): boolean {
            // Manage event
            if (event.eventType !== EventType.GUI_EVENT)
                return false;

            if (event.guiEvent.eventType !== GUIEventType.GRID_ROW_ADDED && event.guiEvent.eventType !== GUIEventType.GRID_ROW_REMOVED)
                return false;

            var object: ReflectionProbe = this._editionTool.object;

            // Manage lists
            if (event.guiEvent.caller === this._includedMeshesList) {
                var selected = this._includedMeshesList.getSelectedRows();

                for (var i = 0; i < selected.length; i++) {
                    var mesh = object.renderList[selected[i] - i];
                    var index = object.renderList.indexOf(mesh);

                    if (index !== -1)
                        object.renderList.splice(index, 1);

                    this._excludedMeshesList.addRow({ name: mesh.name });
                }
                return true;
            }

            else if (event.guiEvent.caller === this._excludedMeshesList) {
                var selected = this._excludedMeshesList.getSelectedRows();

                for (var i = 0; i < selected.length; i++) {
                    var mesh = <AbstractMesh>this._editionTool.core.currentScene.getMeshByName(this._excludedMeshesList.getRow(selected[i]).name);
                    object.renderList.push(mesh);

                    this._includedMeshesList.addRow({ name: mesh.name });
                    this._excludedMeshesList.removeRow(selected[i]);
                }

                return true;
            }

            return false;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof ReflectionProbe) {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Reflection Probe" });
        }

        // Update
        public update(): void {
            super.update();

            var object: ReflectionProbe = this.object = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name").onChange((result: any) => {
                object.cubeTexture.name = result;
            });
            generalFolder.add(object, "refreshRate").name("Refresh Rate").min(1.0).step(1);
            generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");

            // Position
            var positionFolder = this._element.addFolder("Position");
            positionFolder.add(object.position, "x").step(0.01);
            positionFolder.add(object.position, "y").step(0.01);
            positionFolder.add(object.position, "z").step(0.01);
        }

        private _setIncludedMeshes(): void {
            // IDs
            var bodyID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT";
            var leftPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-LEFT";
            var rightPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-RIGHT";
            var excludedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-EXCLUDED";
            var includedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-INCLUDED";

            // Window
            var body = GUI.GUIElement.CreateElement("div", bodyID);

            this._window = new GUI.GUIWindow("REFLECTION-PROBES-RENDER-LIST-WINDOW", this._editionTool.core, "Configure Render List", body);
            this._window.modal = true;
            this._window.size.x = 800;
            this._window.buildElement(null);

            this._window.setOnCloseCallback(() => {
                this._includedMeshesList.destroy();
                this._excludedMeshesList.destroy();
                this._layouts.destroy();

                this._includedMeshesList = null;
                this._excludedMeshesList = null;
            });

            this._window.onToggle = (maximized: boolean, width: number, height: number) => {
                this._layouts.getPanelFromType("left").width = width / 2;
                this._layouts.getPanelFromType("main").width = height / 2;
                this._layouts.resize();
            };

            // Layout
            var leftDiv = GUI.GUIElement.CreateElement("div", leftPanelID);
            var rightDiv = GUI.GUIElement.CreateElement("div", rightPanelID);

            this._layouts = new GUI.GUILayout(bodyID, this._editionTool.core);
            this._layouts.createPanel(leftDiv, "left", 400, true).setContent(leftDiv);
            this._layouts.createPanel(rightDiv, "main", 400, true).setContent(rightDiv);
            this._layouts.buildElement(bodyID);

            // Lists
            var scene = this._editionTool.core.currentScene;
            var object = <ReflectionProbe>this._editionTool.object;

            this._excludedMeshesList = new GUI.GUIGrid<IReflectionProbeRow>(excludedListID, this._editionTool.core);
            this._excludedMeshesList.header = "Excluded Meshes";
            this._excludedMeshesList.showAdd = true;
            this._excludedMeshesList.createColumn("name", "name", "100%");
            this._excludedMeshesList.buildElement(leftPanelID);

            for (var i = 0; i < scene.meshes.length; i++) {
                if (object.renderList.indexOf(scene.meshes[i]) === -1)
                    this._excludedMeshesList.addRow({
                        name: scene.meshes[i].name
                    });
            }

            this._includedMeshesList = new GUI.GUIGrid<IReflectionProbeRow>(includedListID, this._editionTool.core);
            this._includedMeshesList.header = "Included Meshes";
            this._includedMeshesList.showDelete = true;
            this._includedMeshesList.createColumn("name", "name", "100%");
            this._includedMeshesList.buildElement(rightPanelID);

            for (var i = 0; i < object.renderList.length; i++) {
                this._includedMeshesList.addRow({
                    name: object.renderList[i].name
                });
            }
        }
    }
}