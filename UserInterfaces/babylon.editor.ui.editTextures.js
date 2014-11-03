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
                        this._currentTexture = new BABYLON.Texture(tex.url, this._scene, tex._noMipMap, tex.invertY, tex._samplingMode, null, null, tex._buffer);
                        this._plane.material.diffuseTexture = this._currentTexture;
                    }
                }

            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_ROW_REMOVED) {
                if (ev.event.caller == this._grid) {
                    var selectedRows = this._grid.getSelectedRows();
                    var textures = new Array(); /// Fill a temp array
                    for (var i = 0; i < selectedRows.length; i++)
                        textures.push(this.core.currentScene.textures[selectedRows[i]]);
                    for (var i = 0; i < textures.length; i++) /// Dispose textures
                        textures[i].dispose();
                }
            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_ADD_ROW) {
                this._textureFiles = document.getElementById('BabylonEditorEditTexturesFileInput');
                var scope = this;
                this._textureFiles.onchange = function (event) {
                    var ev = new BABYLON.Editor.Event();
                    ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                    ev.event = new BABYLON.Editor.Event.GUIEvent();
                    ev.event.eventType = BABYLON.Editor.Event.GUIEvent.FILE_SELECTED;
                    ev.event.caller = scope._textureFiles;
                    ev.event.result = event;
                    scope.core.sendEvent(ev);
                }
                this._textureFiles.click();
            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                if (ev.event.caller == this._window) { /// It is the "Close" button
                    _super.prototype.close.call(this);
                    this._close();
                }

            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FILE_SELECTED) {

                if (ev.event.caller == this._textureFiles) {
                    var scope = this;
                    var files = ev.event.result.target.files || ev.event.result.currentTarget.files;

                    for (var i = 0; i < files.length; i++) {

                        var file = files[i];
                        var name = file.name;
                        var extension = name.substr(name.length - 4, 4).toLowerCase();
                        var isDDS = this._engine.getCaps().s3tc && (extension === ".dds");
                        var isTGA = (extension === ".tga");

                        var callback = function (name) {
                            return function (result) {
                                var url = 'data:' + name + ':';
                                var tex = new BABYLON.Texture(url, scope.core.currentScene, false, false, BABYLON.Texture.TRILINEAR_SAMPLINGMOD, null, null, result);
                                tex.coordinatesMode = BABYLON.Texture.PROJECTION_MODE;
                                /// Textures musn't have same name
                                var j = 0;
                                while (BABYLON.Editor.Utils.GetTextureFromName(name + (j == 0 ? '' : j), this.core.currentScene)) {
                                    j++;
                                }
                                tex.name = j == 0 ? name : name + j;
                                scope._grid.addRow({ path: tex.name });
                            }
                        };

                        if (isDDS || isTGA)
                            BABYLON.Tools.ReadFile(file, callback(name), null, true);
                        else
                            BABYLON.Tools.ReadFileAsDataURL(file, callback(name), null);

                    }

                    ev.event.result.target.files = [];

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
        this._window = new BABYLON.Editor.GUIWindow('BabylonEditorEditTexturesWindow', this.core, 'Edit Textures', '<div id="BabylonEditorEditTexturesLayout" style="height: 100%"></div>', new BABYLON.Vector2(1000, 500), ['Close']);
        this._window.showMax = true;
        this._window.buildElement();

        /// Create layouts
        this._layouts = new BABYLON.Editor.GUILayout('BabylonEditorEditTexturesLayout', this.core);
        this._layouts.createPanel('TexturesList', 'left', 500, true).setContent(
            '<div id="EditTexturesGrid" style="height: 100%;"></div>'
            + '<input type="file" id="BabylonEditorEditTexturesFileInput" multiple style="display:none" />'
        );
        this._layouts.createPanel('TexturePreview', 'right', 500, true).setContent('<canvas id="editTexturesCanvas" style="height: 100%; width: 100%"></canvas>');
        this._layouts.buildElement('BabylonEditorEditTexturesLayout');

        /// Create grid
        this._grid = new BABYLON.Editor.GUIGrid('EditTexturesGrid', this.core, 'Textures');
        this._grid.createColumn('path', 'Texture Path', '100%');
        this._grid.showDelete = true;
        this._grid.showAdd = true;
        this._grid.buildElement('EditTexturesGrid');

        for (var i = 0; i < this.core.currentScene.textures.length; i++) {
            var tex = this.core.currentScene.textures[i];
            this._grid.addRow({ path: tex.name });
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
        this._window.onClose(function () {
            scope._grid.destroy();
            scope._layouts.destroy();

            _super.prototype.close.call(scope);
            scope._engine.dispose();
        });
        this._window.addElementsToResize([this._layouts]);
        this._window.onToggle(function (maximized, width, height) {
            scope._layouts.setSize('right', maximized ? width - 500 : 500);
            scope._engine.resize();
        });

    }

    return EditTextures;

})(BABYLON.Editor.Plugin);


this.createPlugin = function (parameters) {
    return new EditTextures();
}
//# sourceMappingURL=babylon.editor.ui.editTextures.js.map
