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
                if (ev.event.caller == this._window) {
                    /// Close
                    if (ev.event.result == 'PopupButtonClose') {
                        this._close();
                    }
                    else if (ev.event.result == "PopupButtonAdd") {
                        this._accept();
                    }
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
            var parameters = this._form.getElements();

            for (var i = 0; i < this._meshFiles.contents.length; i++) {
                if (this._meshFiles.contents[i].name.indexOf('.babylon') !== -1) {
                    var datas = 'data:' + atob(this._meshFiles.contents[i].content);

                    BABYLON.SceneLoader.ImportMesh(null, null, datas, this.core.currentScene, function (meshes) {
                        for (var j = 0; j < meshes.length; j++) {
                            /// Name
                            if (!meshes[j].parent)
                                meshes[j].name = parameters['AddMeshObjectName'].value;
                            /// Scaling factor
                            meshes[j].scaling.x *= parameters['AddMeshScaleFactor'].value;
                            meshes[j].scaling.y *= parameters['AddMeshScaleFactor'].value;
                            meshes[j].scaling.z *= parameters['AddMeshScaleFactor'].value;
                            /// Shadows
                            meshes[j].receiveShadows = parameters['AddMeshReceiveShadows'].checked;
                            if (parameters['AddMeshCastShadows'].checked) {
                                BABYLON.Editor.Utils.addObjectInShadowsCalculations(meshes[j], scope.core.currentScene);
                            }
                            /// Others
                            meshes[j].isPickable = true;
                            meshes[j].position = new BABYLON.Vector3(0, 0, 0);
                            meshes[j].id = BABYLON.Editor.Utils.generateUUID();
                            BABYLON.Editor.Utils.sendEventObjectAdded(meshes[j], scope.core);
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
            var meshTask = assetsManager.addMeshTask(data.contents[i].name, '', '', datas);

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
        this._window = new BABYLON.Editor.GUIWindow('BabylonEditorAddMeshWindow', this.core, 'Add a new mesh', '<div id="BabylonEditorAddMeshLayout" style="height: 100%"></div>', new BABYLON.Vector2(800, 500), ['Add', 'Close']);
        this._window.buildElement();

        /// Create layouts
        this._layouts = new BABYLON.Editor.GUILayout('BabylonEditorAddMeshLayout', this.core);
        this._layouts.createPanel('CanvasPanel', 'left', 400, false).setContent('<canvas id="addMeshRenderCanvas" style="height: 100%; width: 100%"></canvas>');
        this._layouts.createPanel('OptionsPanel', 'right', 400, false).setContent('<div id="AddMeshOptions"></div>');
        this._layouts.buildElement('BabylonEditorAddMeshLayout');

        /// Create Form
        BabylonEditorUICreator.Form.createDivsForForms(['AddMeshForm'], 'AddMeshOptions', true);

        this._form = new BABYLON.Editor.GUIForm('AddMeshOptions', this.core, 'Add Mesh');

        this._form.createField('AddMeshFile', 'file', 'Select Mesh...', 6);
        this._form.createField('AddMeshObjectName', 'text', 'Name :', 6);
        this._form.createField('AddMeshScaleFactor', 'text', 'Scale Factor :', 6);
        this._form.createField('AddMeshReceiveShadows', 'checkbox', 'Receive Shadows :', 6);
        this._form.createField('AddMeshCastShadows', 'checkbox', 'Cast Shadows :', 6);

        this._form.buildElement('AddMeshForm');

        this._form.fillSpecifiedFields(
            ['AddMeshObjectName', 'AddMeshScaleFactor', 'AddMeshReceiveShadows', 'AddMeshCastShadows'],
            ['New Mesh', '0.1', false, true]
        );

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
        this._window.onClose(function () {
            _super.prototype.close.call(scope);
            scope._engine.dispose();
        });
        this._window.removeElementsOnClose(['BabylonEditorAddMeshLayout', 'AddMeshOptions']);
    }

    return AddMesh;

})(BABYLON.Editor.Plugin);


this.createPlugin = function () {
    return new AddMesh();
}
//# sourceMappingURL=babylon.editor.ui.addMesh.js.map
