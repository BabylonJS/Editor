var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ReflectionProbeTool = (function (_super) {
            __extends(ReflectionProbeTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ReflectionProbeTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "REFLECTION.PROBE.TAB";
                // Private members
                this._window = null;
                this._excludedMeshesList = null;
                this._includedMeshesList = null;
                this._layouts = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-RENDER-TARGET"
                ];
                this._editionTool.core.eventReceivers.push(this);
            }
            // On event
            ReflectionProbeTool.prototype.onEvent = function (event) {
                // Manage event
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType !== EDITOR.GUIEventType.GRID_ROW_ADDED && event.guiEvent.eventType !== EDITOR.GUIEventType.GRID_ROW_REMOVED)
                    return false;
                var object = this.object;
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
                        var mesh = this._editionTool.core.currentScene.getMeshByName(this._excludedMeshesList.getRow(selected[i]).name);
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
            };
            // Object supported
            ReflectionProbeTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ReflectionProbe || object instanceof BABYLON.RenderTargetTexture
                    || (object instanceof BABYLON.Light && object.getShadowGenerator())) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            ReflectionProbeTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Render" });
            };
            // Update
            ReflectionProbeTool.prototype.update = function () {
                var _this = this;
                _super.prototype.update.call(this);
                var object = this.object = this._editionTool.object;
                if (object instanceof BABYLON.Light && object.getShadowGenerator()) {
                    object = this.object = object.getShadowGenerator().getShadowMap();
                }
                var scene = this._editionTool.core.currentScene;
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name").onChange(function (result) {
                    var sidebar = _this._editionTool.core.editor.sceneGraphTool.sidebar;
                    var element = sidebar.getSelectedNode();
                    if (element) {
                        element.text = result;
                        sidebar.refresh();
                    }
                });
                generalFolder.add(object, "refreshRate").name("Refresh Rate").min(0.0).step(1);
                generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");
                if (object instanceof BABYLON.ReflectionProbe)
                    generalFolder.add(this, "_attachToMesh").name("Attach To Mesh...");
                if (object instanceof BABYLON.RenderTargetTexture)
                    generalFolder.add(this, "_exportRenderTarget").name("Dump Render Target");
                // Position
                if (object instanceof BABYLON.ReflectionProbe) {
                    var positionFolder = this._element.addFolder("Position");
                    positionFolder.add(object.position, "x").step(0.01);
                    positionFolder.add(object.position, "y").step(0.01);
                    positionFolder.add(object.position, "z").step(0.01);
                }
                return true;
            };
            // Dumps the render target and opens a window
            ReflectionProbeTool.prototype._exportRenderTarget = function () {
                var _this = this;
                var rt = this.object;
                var tempCallback = rt.onAfterRender;
                var width = rt.getSize().width;
                var height = rt.getSize().height;
                rt.onAfterRender = function () {
                    BABYLON.Tools.DumpFramebuffer(width, height, _this._editionTool.core.engine, function (data) {
                        EDITOR.Tools.OpenWindowPopup(data, width, height);
                    });
                };
                rt.render(false);
                this._editionTool.core.currentScene.incrementRenderId();
                if (tempCallback)
                    tempCallback(0);
                rt.onAfterRender = tempCallback;
            };
            // Attaches to a mesh
            ReflectionProbeTool.prototype._attachToMesh = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(picker.core.currentScene.meshes);
                picker.onObjectPicked = function (names) {
                    if (names.length > 1) {
                        var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Reflection Probe can be attached to only one mesh.\n" +
                            "The first was considered as the mesh.");
                        dialog.buildElement(null);
                    }
                    _this.object.attachToMesh(picker.core.currentScene.getMeshByName(names[0]));
                };
                picker.open();
            };
            // Sets the included/excluded meshes
            ReflectionProbeTool.prototype._setIncludedMeshes = function () {
                var _this = this;
                // IDs
                var bodyID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT";
                var leftPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-LEFT";
                var rightPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-RIGHT";
                var excludedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-EXCLUDED";
                var includedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-INCLUDED";
                // Window
                var body = EDITOR.GUI.GUIElement.CreateElement("div", bodyID);
                this._window = new EDITOR.GUI.GUIWindow("REFLECTION-PROBES-RENDER-LIST-WINDOW", this._editionTool.core, "Configure Render List", body);
                this._window.modal = true;
                this._window.size.x = 800;
                this._window.buildElement(null);
                this._window.setOnCloseCallback(function () {
                    _this._includedMeshesList.destroy();
                    _this._excludedMeshesList.destroy();
                    _this._layouts.destroy();
                    _this._includedMeshesList = null;
                    _this._excludedMeshesList = null;
                });
                this._window.onToggle = function (maximized, width, height) {
                    _this._layouts.getPanelFromType("left").width = width / 2;
                    _this._layouts.getPanelFromType("main").width = height / 2;
                    _this._layouts.resize();
                };
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateElement("div", leftPanelID);
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("div", rightPanelID);
                this._layouts = new EDITOR.GUI.GUILayout(bodyID, this._editionTool.core);
                this._layouts.createPanel(leftDiv, "left", 400, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 400, true).setContent(rightDiv);
                this._layouts.buildElement(bodyID);
                // Lists
                var scene = this._editionTool.core.currentScene;
                var object = this.object;
                this._excludedMeshesList = new EDITOR.GUI.GUIGrid(excludedListID, this._editionTool.core);
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
                this._includedMeshesList = new EDITOR.GUI.GUIGrid(includedListID, this._editionTool.core);
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
            };
            return ReflectionProbeTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.ReflectionProbeTool = ReflectionProbeTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
