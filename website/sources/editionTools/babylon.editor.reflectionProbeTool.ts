module BABYLON.EDITOR {
    interface IReflectionProbeRow extends GUI.IGridRowData {
        name: string;
    }

    export class ReflectionProbeTool extends AbstractDatTool implements IEventReceiver {
        // Public members
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
                "BABYLON-EDITOR-EDITION-TOOL-RENDER-TARGET"
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

            var object: ReflectionProbe | RenderTargetTexture = this.object;

            // Manage lists
            if (event.guiEvent.caller === this._includedMeshesList) {
                var selected = this._includedMeshesList.getSelectedRows();

                for (var i = 0; i < selected.length; i++) {
                    var mesh = object.renderList[selected[i] - i];
                    var index = object.renderList.indexOf(mesh);

                    if (index !== -1)
                        object.renderList.splice(index, 1);

                    //this._excludedMeshesList.addRow({ name: mesh.name });
                    this._excludedMeshesList.addRecord({ name: mesh.name });
                }

                this._excludedMeshesList.refresh();

                return true;
            }

            else if (event.guiEvent.caller === this._excludedMeshesList) {
                var selected = this._excludedMeshesList.getSelectedRows();
                var offset = 0;

                for (var i = 0; i < selected.length; i++) {
                    var mesh = <AbstractMesh>this._editionTool.core.currentScene.getMeshByName(this._excludedMeshesList.getRow(selected[i]).name);
                    object.renderList.push(mesh);

                    //this._includedMeshesList.addRow({ name: mesh.name });
                    this._includedMeshesList.addRecord({ name: mesh.name });
                    //this._excludedMeshesList.removeRow(selected[i]);
                    this._excludedMeshesList.removeRecord(selected[i] - offset);
                    offset++;
                }

                this._includedMeshesList.refresh();
                this._excludedMeshesList.refresh();

                return true;
            }

            return false;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof ReflectionProbe || object instanceof RenderTargetTexture
                || (object instanceof Light && (<Light>object).getShadowGenerator()))
            {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Render" });
        }

        // Update
        public update(): boolean {
            super.update();

            var object: ReflectionProbe | RenderTargetTexture | Light = this.object = this._editionTool.object;

            if (object instanceof Light && (<Light>object).getShadowGenerator()) {
                object = this.object = (<Light>object).getShadowGenerator().getShadowMap();
            }

            var scene = this._editionTool.core.currentScene;

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name").onChange((result: any) => {
                var sidebar = this._editionTool.core.editor.sceneGraphTool.sidebar;
                var element = sidebar.getSelectedNode();

                if (element) {
                    element.text = result;
                    sidebar.refresh();
                }
            });
            generalFolder.add(object, "refreshRate").name("Refresh Rate").min(0.0).step(1);
            generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");

            if (object instanceof ReflectionProbe)
                generalFolder.add(this, "_attachToMesh").name("Attach To Mesh...");

            if (object instanceof RenderTargetTexture)
                generalFolder.add(this, "_exportRenderTarget").name("Dump Render Target");

            // Position
            if (object instanceof ReflectionProbe) {
                var positionFolder = this._element.addFolder("Position");
                positionFolder.add(object.position, "x").step(0.01);
                positionFolder.add(object.position, "y").step(0.01);
                positionFolder.add(object.position, "z").step(0.01);
            }

            return true;
        }

        // Dumps the render target and opens a window
        private _exportRenderTarget(): void {
            var rt: RenderTargetTexture = this.object;
            var tempCallback = rt.onAfterRender;
            var width = rt.getSize().width;
            var height = rt.getSize().height;

            rt.onAfterRender = () => {
                BABYLON.Tools.DumpFramebuffer(width, height, this._editionTool.core.engine, (data: string) => {
                    Tools.OpenWindowPopup(data, width, height);
                });
            };

            rt.render(false);
            this._editionTool.core.currentScene.incrementRenderId();

            if (tempCallback)
                tempCallback(0);

            rt.onAfterRender = tempCallback;
        }

        // Attaches to a mesh
        private _attachToMesh(): void {
            var picker = new ObjectPicker(this._editionTool.core);
            picker.objectLists.push(picker.core.currentScene.meshes);

            picker.onObjectPicked = (names: string[]) => {
                if (names.length > 1) {
                    var dialog = new GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning",
                        "A Reflection Probe can be attached to only one mesh.\n" +
                        "The first was considered as the mesh."
                    );
                    dialog.buildElement(null);
                }

                (<ReflectionProbe>this.object).attachToMesh(picker.core.currentScene.getMeshByName(names[0]));
            };

            picker.open();
        }

        // Sets the included/excluded meshes
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
            var object = <RenderTargetTexture>this.object;

            this._excludedMeshesList = new GUI.GUIGrid<IReflectionProbeRow>(excludedListID, this._editionTool.core);
            this._excludedMeshesList.header = "Excluded Meshes";
            this._excludedMeshesList.showAdd = true;
            this._excludedMeshesList.createColumn("name", "name", "100%");
            this._excludedMeshesList.buildElement(leftPanelID);

            for (var i = 0; i < scene.meshes.length; i++) {
                if (object.renderList.indexOf(scene.meshes[i]) === -1)
                    this._excludedMeshesList.addRecord({
                        name: scene.meshes[i].name
                    });
            }
            this._excludedMeshesList.refresh();

            this._includedMeshesList = new GUI.GUIGrid<IReflectionProbeRow>(includedListID, this._editionTool.core);
            this._includedMeshesList.header = "Included Meshes";
            this._includedMeshesList.showDelete = true;
            this._includedMeshesList.createColumn("name", "name", "100%");
            this._includedMeshesList.buildElement(rightPanelID);

            for (var i = 0; i < object.renderList.length; i++) {
                this._includedMeshesList.addRecord({
                    name: object.renderList[i].name
                });
            }
            this._includedMeshesList.refresh();
        }
    }
}