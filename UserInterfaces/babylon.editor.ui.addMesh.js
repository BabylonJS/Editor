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

        /// Datas
        this._canvas = null;
        this._engine = null;
        this._scene = null;
        this._camera = null;

        this._meshFiles = null;
    }

    AddMesh.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.eventReceivers.push(this);
        this._createUI();

    }

    AddMesh.prototype.onEvent = function (ev) {
        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            /// Button clicked
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                /// Close
                if (ev.event.caller.id == 'PopupButtonClose') {
                    this._close();
                }
                else /// Add
                if (ev.event.caller.id == "PopupButtonAdd") {
                    this._accept();
                }
            }
            else /// Form changed
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {
                if (ev.event.caller == this._form) {
                    if (ev.event.result && ev.event.result.caller === 'AddMeshFile') {
                        this._meshFiles = ev.event.result;
                        this._loadMesh(ev.event.result);
                    }
                }
            }
        }
    }

    AddMesh.prototype._accept = function () {
        if (this._meshFiles != null) {

            var scope = this;
            var parameters = BabylonEditorUICreator.Form.getElements(this._form);

            for (var i = 0; i < this._meshFiles.contents.length; i++) {
                if (this._meshFiles.contents[i].name.indexOf('.babylon') !== -1) {
                    var datas = 'data:' + atob(this._meshFiles.contents[i].content);

                    BABYLON.SceneLoader.ImportMesh(null, null, datas, this.core.currentScene, function (meshes) {
                        for (var i = 0; i < meshes.length; i++) {
                            /// Name
                            if (!meshes[i].parent)
                                meshes[i].name = parameters.fields['AddMeshObjectName'].value;
                            /// Scaling factor
                            meshes[i].scaling.x *= parameters.fields['AddMeshScaleFactor'].value;
                            meshes[i].scaling.y *= parameters.fields['AddMeshScaleFactor'].value;
                            meshes[i].scaling.z *= parameters.fields['AddMeshScaleFactor'].value;
                            /// Shadows
                            meshes[i].receiveShadows = parameters.fields['AddMeshReceiveShadows'].checked;
                            if (parameters.fields['AddMeshCastShadows'].checked) {
                                BABYLON.Editor.Utils.addObjectInShadowsCalculations(meshes[i], scope.core.currentScene);
                            }
                            /// Others
                            meshes[i].isPickable = true;
                            meshes[i].position = new BABYLON.Vector3(0, 0, 0);
                            meshes[i].id = BABYLON.Editor.Utils.generateUUID();
                            BABYLON.Editor.Utils.sendEventObjectAdded(meshes[i], scope.core);
                        }
                    });

                }

            }
        }
        this._meshFiles = null;
        this._scene.dispose();
        this._close();
    }

    AddMesh.prototype._loadMesh = function (data) {

        var assetsManager = new BABYLON.AssetsManager(this._scene);

        for (var i = 0; i < data.contents.length; i++) {
            var datas = 'data:' + atob(data.contents[i].content);
            var meshTask = assetsManager.addMeshTask(data.contents[i].name, null, null, datas);

            meshTask.onSuccess = function (task) {
                for (var j = 0; j < task.loadedMeshes.length; j++)
                    task.loadedMeshes[j].position = new BABYLON.Vector3(0, 0, 0);
            }
        }

        assetsManager.load();
    }

    AddMesh.prototype._close = function () {
        this._window.close();
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
            BabylonEditorUICreator.Form.createField('AddMeshFile', 'file', 'Select Mesh...', 6),
            BabylonEditorUICreator.Form.createField('AddMeshObjectName', 'text', 'Name :', 6),
            BabylonEditorUICreator.Form.createField('AddMeshScaleFactor', 'text', 'Scale Factor :', 6),
            BabylonEditorUICreator.Form.createField('AddMeshReceiveShadows', 'checkbox', 'Receive Shadows :', 6),
            BabylonEditorUICreator.Form.createField('AddMeshCastShadows', 'checkbox', 'Cast Shadows :', 6)
        ]);
        this._form = BabylonEditorUICreator.Form.createForm('AddMeshForm', 'Add Mesh', fields, this, this.core);
        BabylonEditorUICreator.Form.extendRecord(this._form, {
            AddMeshObjectName: 'New Mesh',
            AddMeshScaleFactor: '0.1',
            AddMeshCastShadows: true,
            AddMeshReceiveShadows: false,
        });

        /// Create engine and scene
        this._canvas = document.getElementById("addMeshRenderCanvas");

        this._engine = new BABYLON.Engine(this._canvas, true);
        this._scene = new BABYLON.Scene(this._engine);
        this._scene.clearColor = new BABYLON.Color3(0, 0, 0);

        this._camera = new BABYLON.ArcRotateCamera("AddMeshCamera", 1, 1.3, 100, new BABYLON.Vector3(0, 0, 0), this._scene);
        this._camera.attachControl(this._canvas, false);

        var light = new BABYLON.DirectionalLight("globalLight", new BABYLON.Vector3(-1, -2, -1), this._scene);
        light.position = new BABYLON.Vector3(1000, 1000, 0);

        this._engine.runRenderLoop(function () {
            scope._scene.render();
        });

        /// Configure window
        BabylonEditorUICreator.Popup.removeElementsOnClose(this._window, ['addMeshMainLayout', 'AddMeshForm'],
            function () {
                _super.prototype.close.call(this);
                scope._engine.dispose();
            }
        );
    }

    return AddMesh;

})(BABYLON.Editor.Plugin);


this.createPlugin = function () {
    return new AddMesh();
}
//# sourceMappingURL=babylon.editor.ui.addMesh.js.map
