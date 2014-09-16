/// <reference path="../index.html" />

/// Extends (already exists)
var __extends = this.__extends;

var EditTextures = (function (_super) {
    __extends(EditTextures, _super);
    function EditTextures() {
        /// Extend class
        _super.call(this);

        /// Scene
        this._canvas = null;
        this._engine = null;
        this._scene = null;
        this._plane = null;
        this._currentTexture = null;

        /// UI
        this._window = null;
        this._layouts = null;
        this._grid = null;
    }

    EditTextures.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.eventReceivers.push(this);
        this._createUI();
    }

    EditTextures.prototype.onEvent = function (ev) {
        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            /// Button clicked
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_SELECTED) {
                /// Close
                if (ev.event.caller == this._grid) {
                    if (ev.event.result > -1) {
                        if (this._currentTexture)
                            this._currentTexture.dispose();
                        this._currentTexture = new BABYLON.Texture(this.core.currentScene.textures[ev.event.result].url, this._scene);
                        this._plane.material.diffuseTexture = this._currentTexture;
                    }
                }
            } else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                if (ev.event.caller.id == 'PopupButtonClose') {
                    _super.prototype.close.call(this);
                    this._close();
                }
            }
        }
    }

    EditTextures.prototype._close = function () {
        this._window.close();
    }

    EditTextures.prototype._createUI = function () {
        var scope = this;

        /// Create popup with a canvas
        this._window = BabylonEditorUICreator.Popup.createWindow(
            'Edit Textures', '<div id="EditTexturesMainLayout" style="height: 100%"></div>', false, 1000, 500,
            ['Close'], this.core
        );

        /// Create layouts
        var pstyle = BabylonEditorUICreator.Layout.Style;
        var panels = new Array();
        BabylonEditorUICreator.Layout.extendPanels(panels, [
            BabylonEditorUICreator.Layout.createPanel('left', 500, true, pstyle, '<div id="EditTexturesGrid" style="height: 100%;"></div>', 500),
            BabylonEditorUICreator.Layout.createPanel('right', 500, true, pstyle, '<canvas id="editTexturesCanvas" style="height: 100%; width: 100%"></canvas>', 500),
        ]);
        this._layouts = BabylonEditorUICreator.Layout.createLayout('EditTexturesMainLayout', panels);

        /// Create grid
        this._grid = BabylonEditorUICreator.Grid.createGrid('EditTexturesGrid', 'Textures', 'Textures', [
                BabylonEditorUICreator.Grid.createColumn('path', 'Texture path', '100%')
            ], [ /* No records here...*/], this.core
        );

        /// Fill grid
        for (var i = 0; i < this.core.currentScene.textures.length; i++) {
            var tex = this.core.currentScene.textures[i];
            BabylonEditorUICreator.Grid.addRecord(this._grid, { recid: i, path: tex.name });
        }

        /// Create scene
        this._canvas = document.getElementById("editTexturesCanvas");

        this._engine = new BABYLON.Engine(this._canvas, true);
        this._scene = new BABYLON.Scene(this._engine);
        this._scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);

        this._camera = new BABYLON.FreeCamera("EditTexturesCamera", new BABYLON.Vector3(0, 0, -25), this._scene);

        this._plane = BABYLON.Mesh.CreatePlane("plane", 20.0, this._scene);
        this._plane.material = new BABYLON.StandardMaterial("planem", this._scene);
        this._plane.material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this._plane.material.emissiveColor = new BABYLON.Color3(1, 1, 1);

        this._engine.runRenderLoop(function () {
            scope._scene.render();
        });

        /// Configure window
        BabylonEditorUICreator.Popup.removeElementsOnClose(this._window, ['EditTexturesMainLayout', 'Textures'], function () {
            _super.prototype.close.call(this);
            scope._engine.dispose();
        });
        BabylonEditorUICreator.Popup.addElementsToResize(this._window, [this._layouts]);
    }

    return EditTextures;

})(BABYLON.Editor.Plugin);


this.createPlugin = function () {
    return new EditTextures();
}
//# sourceMappingURL=babylon.editor.ui.editTextures.js.map
