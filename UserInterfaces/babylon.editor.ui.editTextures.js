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
        this._textureFiles = null;
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

                        var tex = this.core.currentScene.textures[ev.event.result];
                        this._currentTexture = new BABYLON.Texture(tex.url, this._scene, tex._noMipMap, tex.invertY, tex._samplingMode, tex._buffer);
                        this._plane.material.diffuseTexture = this._currentTexture;
                    }
                }

            } else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                if (ev.event.caller == this._window) {
                    _super.prototype.close.call(this);
                    this._close();
                }

            } else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FILE_SELECTED) {

                if (ev.event.caller == this._textureFiles) {
                    var scope = this;
                    for (var i = 0; i < ev.event.result.target.files.length; i++) {

                        var file = ev.event.result.target.files[i];
                        var url = file.name;
                        var extension = url.substr(url.length - 4, 4).toLowerCase();
                        var isDDS = this._engine.getCaps().s3tc && (extension === ".dds");
                        var isTGA = (extension === ".tga");

                        var callback = function (result) {
                            var url = 'data:' + file.name + ':';
                            var tex = new BABYLON.Texture(url, scope.core.currentScene, false, false, BABYLON.Texture.TRILINEAR_SAMPLINGMOD, result);
                            tex.name = file.name;
                            var count = BabylonEditorUICreator.Grid.getLineCount(scope._grid);
                            BabylonEditorUICreator.Grid.addRecord(scope._grid, { recid: count, path: tex.name });
                        };

                        if (isDDS || isTGA)
                            BABYLON.Tools.ReadFile(file, callback, null, true);
                        else
                            BABYLON.Tools.ReadFileAsDataURL(file, callback, null);

                    }

                }
            }
        }
    }

    EditTextures.prototype._close = function () {
        BabylonEditorUICreator.Popup.closeWindow(this._window);
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

        /// Create buttons
        this._textureFiles = BabylonEditorUICreator.createCustomField('EditTexturesGrid', 'AddTexturesFiles',
            '<input class="file-input" id="AddTexturesFiles" type="file" name="attachment" multiple="" style="width: 100%;" tabindex="-1">',
            this.core, function (event) {
                BABYLON.Editor.Utils.sendEventFileSelected(scope._textureFiles, event, scope.core);
            }, true
        );

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


this.createPlugin = function (parameters) {
    return new EditTextures();
}
//# sourceMappingURL=babylon.editor.ui.editTextures.js.map
