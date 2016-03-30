var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var coordinatesModes = [
            { id: 0, text: "EXPLICIT_MODE" },
            { id: 1, text: "SPHERICAL_MODE" },
            { id: 2, text: "PLANAR_MODE" },
            { id: 3, text: "CUBIC_MODE" },
            { id: 4, text: "PROJECTION_MODE" },
            { id: 5, text: "SKYBOX_MODE" },
            { id: 6, text: "INVCUBIC_MODE" },
            { id: 7, text: "EQUIRECTANGULAR_MODE" },
            { id: 8, text: "FIXED_EQUIRECTANGULAR_MODE" }
        ];
        var GUITextureEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            * @param object: the object to edit
            * @param propertyPath: the path to the texture property of the object
            */
            function GUITextureEditor(core, objectName, object, propertyPath) {
                this._targetTexture = null;
                this._currentRenderTarget = null;
                this._currentPixels = null;
                this._dynamicTexture = null;
                this._texturesList = null;
                this._engine = null;
                this._scene = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
                this._core.editor.editPanel.close();
                this.object = object;
                this.propertyPath = propertyPath;
                this._objectName = objectName;
                // Initialize object and property path
                if (object && propertyPath) {
                    this._targetObject = object[propertyPath];
                    if (!this._targetObject || !(this._targetObject instanceof BABYLON.BaseTexture)) {
                        this._targetObject = null;
                    }
                }
                // Finish
                this._createUI();
            }
            // On Event
            GUITextureEditor.prototype.onEvent = function (ev) {
                if (ev.eventType === EDITOR.EventType.SCENE_EVENT) {
                    var eventType = ev.sceneEvent.eventType;
                    if (eventType === EDITOR.SceneEventType.OBJECT_ADDED || eventType === EDITOR.SceneEventType.OBJECT_REMOVED) {
                        this._fillTextureList();
                    }
                }
                else if (ev.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (ev.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                        this._engine.resize();
                    }
                }
                return false;
            };
            // Creates the UI
            GUITextureEditor.prototype._createUI = function () {
                var _this = this;
                this._core.editor.editPanel.setPanelSize(40);
                // IDs and elements
                var texturesListID = "BABYLON-EDITOR-TEXTURES-EDITOR-TEXTURES";
                var canvasID = "BABYLON-EDITOR-TEXTURES-EDITOR-CANVAS";
                var texturesListElement = EDITOR.GUI.GUIElement.CreateDivElement(texturesListID, "width: 50%; height: 100%; float: left;");
                var canvasElement = EDITOR.GUI.GUIElement.CreateElement("canvas", canvasID, "width: 50%; height: 100%; float: right;");
                this._core.editor.editPanel.addContainer(texturesListElement, texturesListID);
                this._core.editor.editPanel.addContainer(canvasElement, canvasID);
                // Texture canvas
                this._engine = new BABYLON.Engine($("#" + canvasID)[0], true);
                this._scene = new BABYLON.Scene(this._engine);
                this._scene.clearColor = new BABYLON.Color3(0, 0, 0);
                var camera = new BABYLON.Camera("TextureEditorCamera", BABYLON.Vector3.Zero(), this._scene);
                var postProcess = new BABYLON.PassPostProcess("PostProcessTextureEditor", 1.0, camera);
                postProcess.onApply = function (effect) {
                    if (_this._targetTexture)
                        effect.setTexture("textureSampler", _this._targetTexture);
                };
                this._engine.runRenderLoop(function () {
                    _this._scene.render();
                });
                // Textures list
                this._texturesList = new EDITOR.GUI.GUIGrid(texturesListID, this._core);
                this._texturesList.header = this._objectName ? this._objectName : "Textures ";
                this._texturesList.createColumn("name", "name", "100px");
                this._texturesList.createEditableColumn("coordinatesMode", "Coordinates Mode", { type: "select", items: coordinatesModes }, "80px");
                this._texturesList.createEditableColumn("uScale", "uScale", { type: "float" }, "80px");
                this._texturesList.createEditableColumn("uScale", "vScale", { type: "float" }, "80px");
                this._texturesList.showSearch = true;
                this._texturesList.showOptions = true;
                this._texturesList.showAdd = true;
                this._texturesList.hasSubGrid = true;
                this._texturesList.buildElement(texturesListID);
                this._fillTextureList();
                this._texturesList.onClick = function (selected) {
                    if (selected.length === 0)
                        return;
                    if (_this._currentRenderTarget)
                        _this._restorRenderTarget();
                    var selectedTexture = _this._core.currentScene.textures[selected[0]];
                    if (selectedTexture.name.toLowerCase().indexOf(".hdr") !== -1)
                        return;
                    if (_this._targetTexture)
                        _this._targetTexture.dispose();
                    // If render target, configure canvas. Else, set target texture 
                    if (selectedTexture.isRenderTarget && !selectedTexture.isCube) {
                        _this._currentRenderTarget = selectedTexture;
                        _this._configureRenderTarget();
                    }
                    else {
                        var serializationObject = selectedTexture.serialize();
                        // Guess texture
                        if (selectedTexture._buffer) {
                            serializationObject.base64String = selectedTexture._buffer;
                        }
                        else if (EDITOR.FilesInput.FilesTextures[selectedTexture.name]) {
                            serializationObject.name = selectedTexture.url;
                        }
                        if (!selectedTexture.isCube)
                            _this._targetTexture = BABYLON.Texture.Parse(serializationObject, _this._scene, "");
                    }
                    if (_this.object) {
                        _this.object[_this.propertyPath] = selectedTexture;
                    }
                };
                if (this.object && this.object[this.propertyPath]) {
                    var index = this._core.currentScene.textures.indexOf(this.object[this.propertyPath]);
                    if (index !== -1) {
                        this._texturesList.setSelected([index]);
                        this._texturesList.onClick([index]);
                        this._texturesList.scrollIntoView(index);
                    }
                }
                this._texturesList.onAdd = function () {
                    var inputFiles = $("#BABYLON-EDITOR-LOAD-TEXTURE-FILE");
                    inputFiles[0].onchange = function (data) {
                        for (var i = 0; i < data.target.files.length; i++) {
                            BABYLON.Tools.ReadFileAsDataURL(data.target.files[i], _this._onReadFileCallback(data.target.files[i].name), null);
                        }
                    };
                    inputFiles.click();
                };
                this._texturesList.onReload = function () {
                    _this._fillTextureList();
                };
                this._texturesList.onExpand = function (id, recid) {
                    var originalTexture = _this._core.currentScene.textures[recid];
                    if (!originalTexture)
                        null;
                    var subGrid = new EDITOR.GUI.GUIGrid(id, _this._core);
                    subGrid.showColumnHeaders = false;
                    subGrid.createColumn("name", "Property", "25%", "background-color: #efefef; border-bottom: 1px solid white; padding-right: 5px;");
                    subGrid.createColumn("value", "Value", "75%");
                    subGrid.addRecord({ name: "width", value: originalTexture.getSize().width });
                    subGrid.addRecord({ name: "height", value: originalTexture.getSize().height });
                    subGrid.addRecord({ name: "name", value: originalTexture.name });
                    if (originalTexture instanceof BABYLON.Texture) {
                        subGrid.addRecord({ name: "url", value: originalTexture.url });
                    }
                    return subGrid;
                };
                this._texturesList.onEditField = function (recid, value) {
                    var changes = _this._texturesList.getChanges();
                    for (var i = 0; i < changes.length; i++) {
                        var diff = changes[i];
                        var texture = _this._core.currentScene.textures[diff.recid];
                        delete diff.recid;
                        for (var thing in diff) {
                            if (thing === "coordinatesMode") {
                                texture.coordinatesMode = parseInt(diff.coordinatesMode);
                            }
                            else {
                                texture[thing] = diff[thing];
                            }
                        }
                    }
                };
                // Finish
                this._core.editor.editPanel.onClose = function () {
                    _this._texturesList.destroy();
                    _this._scene.dispose();
                    _this._engine.dispose();
                    _this._core.removeEventReceiver(_this);
                };
            };
            // Configures a render target to be rendered
            GUITextureEditor.prototype._configureRenderTarget = function () {
                var _this = this;
                var width = this._currentRenderTarget.getSize().width;
                var height = this._currentRenderTarget.getSize().height;
                var imgData = new ImageData(width, height);
                this._currentOnAfterRender = this._currentRenderTarget.onAfterRender;
                this._dynamicTexture = new BABYLON.DynamicTexture("RenderTargetTexture", { width: width, height: height }, this._scene, false);
                this._currentRenderTarget.onAfterRender = function (faceIndex) {
                    if (_this._currentOnAfterRender)
                        _this._currentOnAfterRender(faceIndex);
                    _this._currentPixels = _this._core.engine.readPixels(0, 0, width, height);
                    for (var i = 0; i < _this._currentPixels.length; i++)
                        imgData.data[i] = _this._currentPixels[i];
                    _this._dynamicTexture.getContext().putImageData(imgData, 0, 0);
                    _this._dynamicTexture.update(false);
                };
                this._targetTexture = this._dynamicTexture;
            };
            // Restores the render target
            GUITextureEditor.prototype._restorRenderTarget = function () {
                this._currentRenderTarget.onAfterRender = this._currentOnAfterRender;
                this._dynamicTexture.dispose();
                this._dynamicTexture = null;
                this._currentPixels = null;
                this._currentRenderTarget = null;
            };
            // Fills the texture list
            GUITextureEditor.prototype._fillTextureList = function () {
                this._texturesList.clear();
                for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                    var texture = this._core.currentScene.textures[i];
                    var row = {
                        name: texture.name,
                        coordinatesMode: coordinatesModes[texture.coordinatesMode].text,
                        uScale: texture instanceof BABYLON.Texture ? texture.uScale : 0,
                        vScale: texture instanceof BABYLON.Texture ? texture.vScale : 0,
                        recid: i
                    };
                    if (texture.isCube) {
                        row.style = "background-color: #FBFEC0";
                    }
                    else if (texture.isRenderTarget) {
                        row.style = "background-color: #C2F5B4";
                    }
                    this._texturesList.addRecord(row);
                }
                this._texturesList.refresh();
            };
            // On readed texture file callback
            GUITextureEditor.prototype._onReadFileCallback = function (name) {
                var _this = this;
                return function (data) {
                    var texture = BABYLON.Texture.CreateFromBase64String(data, name, _this._core.currentScene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
                    texture.name = texture.name.replace("data:", "");
                    _this._texturesList.addRow({
                        name: name,
                        coordinatesMode: coordinatesModes[texture.coordinatesMode].text,
                        uScale: texture.uScale,
                        vScale: texture.vScale,
                        recid: _this._texturesList.getRowCount() - 1
                    });
                    _this._core.editor.editionTool.isObjectSupported(_this._core.editor.editionTool.object);
                };
            };
            return GUITextureEditor;
        })();
        EDITOR.GUITextureEditor = GUITextureEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
