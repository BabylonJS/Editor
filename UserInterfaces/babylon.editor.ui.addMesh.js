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
        this.engine = null;
        this.scene = null;
    }

    AddMesh.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.customUpdates.push(this);
        this.core.eventReceivers.push(this);
        this._createUI();
    }

    AddMesh.prototype.update = function () {

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
        }
    }

    AddMesh.prototype._loadMesh = function (data) {

        for (var i = 0; i < data.contents.length; i++) {
            if (data.contents[i].type == 'image/jpeg' && data.contents[i].content != null) {
                //BABYLON.Tools.LoadImage(atob(data.contents[i].content), null, null, null);
            }
            else if (data.contents[i].name.indexOf('.babylon') != -1 && data.contents[i].content != null) {
                BABYLON.SceneLoader.ImportMesh(data.contents[i].name, '/', 'data:' + atob(data.contents[i].content), this.core.currentScene, null, null, null);
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
        BabylonEditorUICreator.Form.createDivsForForms(['AddMeshForm'], 'AddMeshOptions', true);
        var fields = new Array();
        BabylonEditorUICreator.Form.extendFields(fields, [
            BabylonEditorUICreator.Form.createField('AddMeshFile', 'file', 'Select Mesh...', 5),
            BabylonEditorUICreator.Form.createField('AddMeshObjectName', 'text', 'Name :', 5)
        ]);
        this._form = BabylonEditorUICreator.Form.createForm('AddMeshForm', 'Add Mesh', fields, this, this.core);

        /// Create engine and scene
        var canvas = document.getElementById("addMeshRenderCanvas");
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);

        var camera = new BABYLON.ArcRotateCamera("AddMeshCamera", 1, 1.3, 100, new BABYLON.Vector3(0, 0, 0), this.scene);
        camera.attachControl(canvas, false);

        var object = BABYLON.Mesh.CreateSphere("sphere1", 64, 2, this.scene);

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
