module BABYLON.EDITOR {
    interface ITextureRow extends GUI.IGridRowData {
        name: string;
    }
    
    interface ISubTextureRow extends GUI.IGridRowData {
        name: string;
        value: string;
    }

    export class GUITextureEditor implements IEventReceiver {
        // Public members
        public object: Object;
        public propertyPath: string;

        // Private members
        private _core: EditorCore;

        private _targetObject: Object;
        private _targetTexture: BaseTexture = null;
        private _objectName: string;
        
        private _currentRenderTarget: RenderTargetTexture = null;
        private _currentPixels: Uint8Array = null;
        private _currentOnAfterRender: (faceIndex: number) => void;
        private _dynamicTexture: DynamicTexture = null;

        private _texturesList: GUI.GUIGrid<ITextureRow> = null;
        
        private _engine: Engine = null;
        private _scene: Scene = null;

        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, objectName?: string, object?: Object, propertyPath?: string) {
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

                if (!this._targetObject || !(this._targetObject instanceof BaseTexture)) {
                    this._targetObject = null;
                }
            }

            // Finish
            this._createUI();
        }
        
        // On Event
        public onEvent(ev: Event): boolean {
            if (ev.eventType === EventType.SCENE_EVENT) {
                var eventType = ev.sceneEvent.eventType;
                
                if (eventType === SceneEventType.OBJECT_ADDED || eventType === SceneEventType.OBJECT_REMOVED) {
                    this._fillTextureList();
                }
            }
            
            else if (ev.eventType === EventType.GUI_EVENT) {
                if (ev.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED) {
                    this._engine.resize();
                }
            }
            
            return false;
        }

        // Creates the UI
        private _createUI(): void {
            this._core.editor.editPanel.setPanelSize(40);

            // IDs and elements
            var texturesListID = "BABYLON-EDITOR-TEXTURES-EDITOR-TEXTURES";
            var canvasID = "BABYLON-EDITOR-TEXTURES-EDITOR-CANVAS";

            var texturesListElement = GUI.GUIElement.CreateDivElement(texturesListID, "width: 50%; height: 100%; float: left;");
            var canvasElement = GUI.GUIElement.CreateElement("canvas", canvasID, "width: 50%; height: 100%; float: right;");

            this._core.editor.editPanel.addContainer(texturesListElement, texturesListID);
            this._core.editor.editPanel.addContainer(canvasElement, canvasID);

            // Texture canvas
            this._engine = new Engine(<HTMLCanvasElement>$("#" + canvasID)[0], true);
            this._scene = new Scene(this._engine);
            this._scene.clearColor = new Color3(0, 0, 0);
            var camera = new Camera("TextureEditorCamera", Vector3.Zero(), this._scene);

            var postProcess = new PassPostProcess("PostProcessTextureEditor", 1.0, camera);
            postProcess.onApply = (effect: Effect) => {
                if (this._targetTexture)
                    effect.setTexture("textureSampler", this._targetTexture);
            };

            this._engine.runRenderLoop(() => {
                this._scene.render();
            });

            // Textures list
            this._texturesList = new GUI.GUIGrid<ITextureRow>(texturesListID, this._core);
            this._texturesList.header = this._objectName ? this._objectName : "Textures ";
            this._texturesList.createColumn("name", "name", "100%");
            this._texturesList.showSearch = false;
            this._texturesList.showOptions = false;
            this._texturesList.showAdd = true;
            this._texturesList.hasSubGrid = true;
            this._texturesList.buildElement(texturesListID);
            
            this._fillTextureList();

            this._texturesList.onClick = (selected: number[]) => {
                if (selected.length === 0)
                    return;

                if (this._currentRenderTarget)
                    this._restorRenderTarget();
                
                var selectedTexture = this._core.currentScene.textures[selected[0]];

                if (selectedTexture.name.toLowerCase().indexOf(".hdr") !== -1)
                    return;

                if (this._targetTexture)
                    this._targetTexture.dispose();
                
                // If render target, configure canvas. Else, set target texture 
                if (selectedTexture.isRenderTarget && !selectedTexture.isCube) {
                    this._currentRenderTarget = <RenderTargetTexture>selectedTexture;
                    this._configureRenderTarget();
                }
                else {
                    var serializationObject = selectedTexture.serialize();
                    
                    // Guess texture
                    if ((<any>selectedTexture)._buffer) {
                        serializationObject.base64String = (<any>selectedTexture)._buffer;
                    }
                    else if (FilesInput.FilesTextures[selectedTexture.name]) {
                        serializationObject.name = (<Texture>selectedTexture).url;
                    }
                    
                    if (!selectedTexture.isCube)
                        this._targetTexture = Texture.Parse(serializationObject, this._scene, "");
                }
                
                if (this.object) {
                    this.object[this.propertyPath] = selectedTexture;
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

            this._texturesList.onAdd = () => {
                var inputFiles = $("#BABYLON-EDITOR-LOAD-TEXTURE-FILE");

                inputFiles[0].onchange = (data: any) => {
                    for (var i = 0; i < data.target.files.length; i++) {
                        BABYLON.Tools.ReadFileAsDataURL(data.target.files[i], this._onReadFileCallback(data.target.files[i].name), null);
                    }
                };
                inputFiles.click();
            };
            
            this._texturesList.onReload = () => {
                this._fillTextureList();
            };
            
            this._texturesList.onExpand = (id: string, recid: number) => {
                var originalTexture = this._core.currentScene.textures[recid];
                if (!originalTexture)
                    null;
                
                var subGrid = new GUI.GUIGrid<ISubTextureRow>(id, this._core);
                subGrid.showColumnHeaders = false;
                
                subGrid.columns = [
                   { field: "name", caption: "Property", size: "25%", style: "background-color: #efefef; border-bottom: 1px solid white; padding-right: 5px;" },
                   { field: "value", caption: "Value", size: "75%", editable: { type: "text" } }
                ];
                
                subGrid.addRecord(<any>{ name: "width", value: originalTexture.getSize().width });
                subGrid.addRecord(<any>{ name: "height", value: originalTexture.getSize().height });
                subGrid.addRecord(<any>{ name: "name", value: originalTexture.name });
                subGrid.addRecord(<any>{ name: "getAlphaFromRGB", value: Tools.BooleanToInt(originalTexture.getAlphaFromRGB) });
                subGrid.addRecord(<any>{ name: "hasAlpha", value: Tools.BooleanToInt(originalTexture.hasAlpha) });
                
                if (originalTexture instanceof Texture) {
                    subGrid.addRecord(<any>{ name: "uScale", value: originalTexture.uScale });
                    subGrid.addRecord(<any>{ name: "vScale", value: originalTexture.vScale });
                }
                
                subGrid.onEditField = (data) => {
                    var record = subGrid.records[data.recid];
                    var value = originalTexture[record.name];
                    
                    if (value === undefined)
                        return;
                    
                    if (typeof value === "boolean") {
                        originalTexture[record.name] = Tools.IntToBoolean(parseFloat(data.value));
                    }
                    else if (typeof value === "number") {
                        originalTexture[record.name] = parseFloat(data.value);
                    }
                    else { // String
                        originalTexture[record.name] = data.value;
                    }
                };
                
                return subGrid;
            };

            // Finish
            this._core.editor.editPanel.onClose = () => {
                this._texturesList.destroy();

                this._scene.dispose();
                this._engine.dispose();
                
                this._core.removeEventReceiver(this);
            };
        }
        
        // Configures a render target to be rendered
        private _configureRenderTarget(): void {
            var width = this._currentRenderTarget.getSize().width;
            var height = this._currentRenderTarget.getSize().height;
            var imgData = new ImageData(width, height);
            
            this._currentOnAfterRender = this._currentRenderTarget.onAfterRender;
            this._dynamicTexture = new DynamicTexture("RenderTargetTexture", { width: width, height: height }, this._scene, false);
            
            this._currentRenderTarget.onAfterRender = (faceIndex: number) => {
                
                if (this._currentOnAfterRender)
                    this._currentOnAfterRender(faceIndex);
                
                this._currentPixels = this._core.engine.readPixels(0, 0, width, height);
                
                for (var i = 0; i < this._currentPixels.length; i++)
                    imgData.data[i] = this._currentPixels[i];
                
                this._dynamicTexture.getContext().putImageData(imgData, 0, 0);
                this._dynamicTexture.update(false);
            };
            
            this._targetTexture = this._dynamicTexture;
        }
        
        // Restores the render target
        private _restorRenderTarget(): void {
            this._currentRenderTarget.onAfterRender = this._currentOnAfterRender;
            
            this._dynamicTexture.dispose();
            this._dynamicTexture = null;
            this._currentPixels = null;
            this._currentRenderTarget = null;
        }
        
        // Fills the texture list
        private _fillTextureList(): void {
            this._texturesList.clear();
            
            for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                var row: ITextureRow = {
                    name: this._core.currentScene.textures[i].name,
                    recid: i
                };
                
                if (this._core.currentScene.textures[i].isCube) {
                    row.style = "background-color: #FBFEC0";
                }
                else if (this._core.currentScene.textures[i].isRenderTarget) {
                    row.style = "background-color: #C2F5B4";
                }
                
                this._texturesList.addRecord(row);
            }
            
            this._texturesList.refresh();
        }

        // On readed texture file callback
        private _onReadFileCallback(name: string): (data: string) => void {
            return (data: string) => {
                var texture = Texture.CreateFromBase64String(data, name, this._core.currentScene, false, false, Texture.BILINEAR_SAMPLINGMODE);
                texture.name = texture.name.replace("data:", "");

                this._texturesList.addRow({
                    name: name,
                    recid: this._texturesList.getRowCount() - 1
                });

                this._core.editor.editionTool.isObjectSupported(this._core.editor.editionTool.object);
            };
        }
    }
}