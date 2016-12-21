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
                this._selectedTexture = null;
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
                    if (eventType === EDITOR.SceneEventType.OBJECT_ADDED || eventType === EDITOR.SceneEventType.OBJECT_REMOVED || eventType === EDITOR.SceneEventType.NEW_SCENE_CREATED) {
                        this._fillTextureList();
                    }
                    else if (eventType === EDITOR.SceneEventType.OBJECT_CHANGED && ev.sceneEvent.object === this._selectedTexture) {
                        if (this._selectedTexture instanceof BABYLON.DynamicTexture)
                            this._targetTexture.update(true);
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
                this._scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
                var camera = new BABYLON.ArcRotateCamera("TextureEditorCamera", 0, 0, 10, BABYLON.Vector3.Zero(), this._scene);
                camera.attachControl(this._engine.getRenderingCanvas());
                var material = new BABYLON.StandardMaterial("TextureEditorSphereMaterial", this._scene);
                material.diffuseColor = new BABYLON.Color3(1, 1, 1);
                material.disableLighting = true;
                var light = new BABYLON.HemisphericLight("TextureEditorHemisphericLight", BABYLON.Vector3.Zero(), this._scene);
                var sphere = BABYLON.Mesh.CreateSphere("TextureEditorSphere", 32, 5, this._scene);
                sphere.setEnabled(false);
                sphere.material = material;
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
                this._texturesList.createColumn("width", "width", "80px");
                this._texturesList.createColumn("height", "height", "80px");
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
                    // Send event texture has been selected
                    EDITOR.Event.sendSceneEvent(selectedTexture, EDITOR.SceneEventType.OBJECT_PICKED, _this._core);
                    // Configure texture to preview
                    if (_this._targetTexture) {
                        _this._targetTexture.dispose();
                        _this._targetTexture = null;
                    }
                    // If render target, configure canvas. Else, set target texture 
                    if (selectedTexture.isRenderTarget && !selectedTexture.isCube) {
                        _this._currentRenderTarget = selectedTexture;
                        _this._configureRenderTarget();
                    }
                    else {
                        var serializationObject = selectedTexture.serialize();
                        if (selectedTexture instanceof BABYLON.DynamicTexture) {
                            _this._targetTexture = new BABYLON.DynamicTexture(selectedTexture.name, { width: selectedTexture.getBaseSize().width, height: selectedTexture.getBaseSize().height }, _this._scene, selectedTexture.noMipmap);
                            var canvas = _this._targetTexture._canvas;
                            canvas.remove();
                            _this._targetTexture._context = selectedTexture._context;
                            _this._targetTexture._canvas = selectedTexture._canvas;
                            _this._targetTexture.update(true);
                        }
                        else if (selectedTexture.name.indexOf("/") !== -1) {
                            _this._targetTexture = BABYLON.Texture.Parse(serializationObject, _this._scene, "");
                        }
                        else {
                            // Guess texture
                            if (selectedTexture._buffer) {
                                serializationObject.base64String = selectedTexture._buffer;
                            }
                            else {
                                var file = BABYLON.FilesInput.FilesTextures[selectedTexture.name.toLowerCase()];
                                if (file) {
                                    serializationObject.name = selectedTexture.url;
                                }
                                serializationObject.url = serializationObject.url || serializationObject.name;
                                if (serializationObject.url.substring(0, 5) !== "file:") {
                                    serializationObject.name = "file:" + serializationObject.name;
                                }
                                if (!file && serializationObject.name.indexOf(".hdr") !== -1) {
                                    _this._targetTexture = new BABYLON.HDRCubeTexture(serializationObject.name, _this._scene, serializationObject.isBABYLONPreprocessed ? null : serializationObject.size);
                                    _this._targetTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                                }
                            }
                            if (!_this._targetTexture)
                                _this._targetTexture = BABYLON.Texture.Parse(serializationObject, _this._scene, "");
                        }
                    }
                    if (_this.object) {
                        _this.object[_this.propertyPath] = selectedTexture;
                    }
                    if (selectedTexture) {
                        _this._selectedTexture = selectedTexture;
                        camera.detachPostProcess(postProcess);
                        if (selectedTexture.isCube && !selectedTexture.isRenderTarget) {
                            sphere.setEnabled(true);
                            material.reflectionTexture = _this._targetTexture;
                        }
                        else {
                            sphere.setEnabled(false);
                            camera.attachPostProcess(postProcess);
                        }
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
                            var name = data.target.files[i].name;
                            var lowerName = name.toLowerCase();
                            if (name.indexOf(".babylon.hdr") !== -1) {
                                BABYLON.Tools.ReadFile(data.target.files[i], _this._onReadFileCallback(name), null, true);
                            }
                            else if (name.indexOf(".hdr") !== -1) {
                                BABYLON.FilesInput.FilesToLoad[name] = data.target.files[i];
                                BABYLON.HDRCubeTexture.generateBabylonHDR("file:" + name, 256, _this._onReadFileCallback(name), function () {
                                    EDITOR.GUI.GUIWindow.CreateAlert("An error occured when converting HDR Texture", "HR Error");
                                });
                            }
                            else if (lowerName.indexOf(".png") !== -1 || lowerName.indexOf(".jpg") !== -1) {
                                BABYLON.FilesInput.FilesTextures[lowerName] = data.target.files[i];
                                BABYLON.Tools.ReadFileAsDataURL(data.target.files[i], _this._onReadFileCallback(lowerName), null);
                            }
                            else {
                                EDITOR.GUI.GUIWindow.CreateAlert("Texture format not supported", "Textre Format Error");
                            }
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
                        width: texture.getBaseSize() ? texture.getBaseSize().width : 0,
                        height: texture.getBaseSize() ? texture.getBaseSize().height : 0,
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
            GUITextureEditor.prototype._addTextureToList = function (texture) {
                this._texturesList.addRow({
                    name: texture.name,
                    width: texture.getBaseSize() ? texture.getBaseSize().width : 0,
                    height: texture.getBaseSize() ? texture.getBaseSize().height : 0,
                    recid: this._texturesList.getRowCount() - 1
                });
                this._core.editor.editionTool.updateEditionTool();
            };
            // On readed texture file callback
            GUITextureEditor.prototype._onReadFileCallback = function (name) {
                var _this = this;
                return function (data) {
                    var texture = null;
                    if (name.indexOf(".hdr") !== -1) {
                        var hdrData = new Blob([data], { type: 'application/octet-stream' });
                        var hdrUrl = window.URL.createObjectURL(hdrData);
                        try {
                            texture = new BABYLON.HDRCubeTexture(hdrUrl, _this._core.currentScene);
                            texture.name = name;
                            BABYLON.FilesInput.FilesToLoad[name] = EDITOR.Tools.CreateFile(new Uint8Array(data), name);
                        }
                        catch (e) {
                            EDITOR.GUI.GUIWindow.CreateAlert("Cannot load HDR texture...", "HDR Texture Error");
                        }
                    }
                    else {
                        texture = BABYLON.Texture.CreateFromBase64String(data, name, _this._core.currentScene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
                        texture.name = texture.url = texture.name.replace("data:", "");
                    }
                    _this._addTextureToList(texture);
                };
            };
            return GUITextureEditor;
        }());
        EDITOR.GUITextureEditor = GUITextureEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.textureEditor.js.map
