/// <reference path="../index.html" />

/// Extends (already exists)
var __extends = this.__extends;

var AddMesh = (function (_super) {
    __extends(AddMesh, _super);
    function AddMesh() {
        /// Extend class
        _super.call(this);
        
        /// UI
        this._window = null;
        this._layouts = null;
        this._form = null;
        this._fileSelector = null;

        /// Datas
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this._filesInput = null;
    }

    AddMesh.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.eventReceivers.push(this);
        this._createUI();

        var scope = this;
        function sceneLoaded(name, scene) {
            scope.scene.dispose();
            scope.scene = scene;
            scope.configureScene();
        }
        this._filesInput = new BABYLON.FilesInput(this.engine, null, this.canvas, sceneLoaded, null, function () {
            scope.scene.activeCamera = scope.camera;
        });
    }

    AddMesh.prototype.configureScene = function () {
        this.scene.clearColor = new BABYLON.Color3(0, 0, 0);

        if (this.scene.meshes.length == 0)
            return;

        var center = new BABYLON.Vector3(0, 0, 0);
        var max = this.scene.meshes[0].getBoundingInfo().maximum.y,
            min = this.scene.meshes[0].getBoundingInfo().maximum.y;

        for (var i = 0; i < this.scene.meshes.length; i++) {
            if (this.scene.meshes[i].getBoundingInfo().maximum.y > max)
                max = this.scene.meshes[i].getBoundingInfo().maximum.y;
            if (this.scene.meshes[i].getBoundingInfo().minimum.y < min)
                min = this.scene.meshes[i].getBoundingInfo().minimum.y;
        }
        center.y = (max - min) / 2.0;

        this.camera = new BABYLON.ArcRotateCamera("AddMeshCamera", 1, 1.3, 100, center, this.scene);
        this.camera.attachControl(this.canvas, false);
    }

    AddMesh.prototype.onEvent = function (ev) {
        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            /// Button clicked
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                /// Close
                if (ev.event.caller.id == 'PopupButtonClose') {
                    this._window.close();
                }
                else /// Add
                if (ev.event.caller.id == "PopupButtonAdd") {
                    this._accept();
                }
            }

            /// Form changed
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {
                if (ev.event.caller == this._form) {
                    if (ev.event.result && ev.event.result.caller === 'AddMeshFile') {
                        this._loadMesh(ev.event.result);
                    }
                }
            }
            else /// File selected
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FILE_SELECTED) {
                if (ev.event.caller == this._fileSelector) {
                    this._filesInput.loadFiles(ev.event.result);
                }
            }
        }
    }

    AddMesh.prototype._accept = function() {
        /// Empty for the moment...
    }

    AddMesh.prototype._createUI = function () {
        var scope = this;

        /// Create popup with a canvas
        this._window = BabylonEditorUICreator.Popup.createWindow(
            'Add a new mesh', '<div id="addMeshMainLayout" style="height: 100%"></div>', false, 800, 500,
            ['Add', 'Close'],
            this.core
        );

        /// Create layouts
        var pstyle = BabylonEditorUICreator.Layout.Style;
        var panels = new Array();
        BabylonEditorUICreator.Layout.extendPanels(panels, [
            BabylonEditorUICreator.Layout.createPanel('left', 400, true, pstyle, '<canvas id="addMeshRenderCanvas" style="height: 100%; width: 100%"></canvas>', 400),
            BabylonEditorUICreator.Layout.createPanel('right', 400, true, pstyle, '<div id="AddMeshOptions"></div>', 400),
        ]);
        this._layouts = BabylonEditorUICreator.Layout.createLayout('addMeshMainLayout', panels);

        /// Create Form
        BabylonEditorUICreator.Form.createDivsForForms(['AddFile', 'AddMeshForm'], 'AddMeshOptions', true);
        var fields = new Array();
        BabylonEditorUICreator.Form.extendFields(fields, [
            BabylonEditorUICreator.Form.createField('AddMeshFile', 'file', 'Select Mesh...', 5),
            BabylonEditorUICreator.Form.createField('AddMeshObjectName', 'text', 'Name :', 5)
        ]);
        this._fileSelector = BabylonEditorUICreator.Form.createInputFileField('AddFile', 'AddMeshFileInput', this.core);
        this._form = BabylonEditorUICreator.Form.createForm('AddMeshForm', 'Add Mesh', fields, this, this.core);

        /// Create engine and scene
        this.canvas = document.getElementById("addMeshRenderCanvas");

        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0, 0, 0);

        this.camera = new BABYLON.ArcRotateCamera("AddMeshCamera", 1, 1.3, 100, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, false);

        this.engine.runRenderLoop(function () {
            scope.scene.render();
        });

        /// Configure window
        BabylonEditorUICreator.Popup.removeElementsOnClose(this._window, ['addMeshMainLayout', 'AddMeshForm'],
            function () {
                scope.engine.dispose();
            }
        );

    }

    return AddMesh;

})(BABYLON.Editor.Plugin);


this.createPlugin = function () {
    return new AddMesh();
}
//# sourceMappingURL=babylon.editor.ui.addMesh.js.map
