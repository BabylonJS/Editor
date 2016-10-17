module BABYLON.EDITOR {
    interface IPostProcessBuilderData {
        name: string;
        program: string;
        postProcess?: PostProcess;
        mainPostProcess?: PostProcess;
    }

    interface IPostProcessGridItem extends GUI.IGridRowData {
        name: string;
    }

    Effect.ShadersStore["editorTemplatePixelShader"] = [
        "varying vec2 vUV;",
        "uniform sampler2D textureSampler;",
        "uniform sampler2D originalSampler;",
        "void main(void) ",
        "{",
        "    gl_FragColor=texture2D(originalSampler, vUV);",
        "}"
    ].join("\n");

    export class PostProcessBuilder implements ITabApplication, IEventReceiver {
        // Public members

        // Private members
        private _core: EditorCore;

        private _engine: Engine = null;
        private _scene: Scene = null;
        private _camera: Camera = null;
        private _texture: Texture = null;
        private _scenePassPostProcess = null;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _postProcessesList: GUI.GUIGrid<IPostProcessGridItem> = null;

        private _selectTemplateWindow: GUI.GUIWindow = null;

        private _editor: AceAjax.Editor = null;
        private _console: AceAjax.Editor = null;

        private _datas: IPostProcessBuilderData[];
        private _currentSelected: number = 0;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;
            core.eventReceivers.push(this);

            // Metadatas
            this._datas = SceneManager.GetCustomMetadata<IPostProcessBuilderData[]>("PostProcessBuilder");
            if (!this._datas) {
                this._datas = [{ name: "NewPostProcess", program: Effect.ShadersStore["passPixelShader"] }];
                SceneManager.AddCustomMetadata("PostProcessBuilder", this._datas);
            }

            // Create UI
            this._createUI();
            this._onPostProcessSelected([0]);

            // Create main post-process
            var postProcess = new PostProcess("mainPostProcess", "editorTemplate", [], ["originalSampler"], 1.0, this._camera);
            postProcess.onApply = (effect: Effect) => {
                effect.setTexture("originalSampler", this._texture);
            };
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._core.removeEventReceiver(this);

            this._postProcessesList.destroy();
            this._editor.destroy();
            this._layouts.destroy();

            this._engine.dispose();
        }

        /**
        * On event
        */
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.KEY_EVENT) {
                if (event.keyEvent.control && event.keyEvent.key === "b" && !event.keyEvent.isDown) {
                    this._onApplyPostProcessChain(false);
                }
            }

            return false;
        }

        // Creates the UI
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Post-Process Builder", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Layout
            this._layouts = new GUI.GUILayout(this._containerID, this._core);
            this._layouts.createPanel("POST-PROCESS-BUILDER-LEFT-PANEL", "left", 300, false).setContent(GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT", "width: 100%; height: 100%;"));
            this._layouts.createPanel("POST-PROCESS-BUILDER-MAIN-PANEL", "main", 0, false).setContent(GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-PROGRAM"));
            this._layouts.createPanel("POST-PROCESS-BUILDER-PREVIEW-PANEL", "preview", 150, true).setContent(GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-CONSOLE"));
            this._layouts.buildElement(this._containerID);

            this._layouts.on("resize", (event) => {
                this._editor.resize(true);
            });

            // GUI
            var container = $("#POST-PROCESS-BUILDER-EDIT");
            container.append(GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT-LIST", "width: 100%; height: 200px;"));

            // List
            this._postProcessesList = new GUI.GUIGrid<IPostProcessGridItem>("POST-PROCESS-BUILDER-EDIT-LIST", this._core);
            this._postProcessesList.createEditableColumn("name", "name", { type: "string" }, "100%");
            this._postProcessesList.multiSelect = false;
            this._postProcessesList.showAdd = true;
            this._postProcessesList.showDelete = true;
            this._postProcessesList.showOptions = false;
            this._postProcessesList.onClick = (selected) => this._onPostProcessSelected(selected);
            this._postProcessesList.onAdd = () => this._onPostProcessAdd();
            this._postProcessesList.onDelete = (selected) => this._onPostProcessRemove(selected);
            this._postProcessesList.onEditField = (recid, value) => this._onPostProcessEditField(recid, value);
            this._postProcessesList.buildElement("POST-PROCESS-BUILDER-EDIT-LIST");

            for (var i = 0; i < this._datas.length; i++)
                this._postProcessesList.addRecord({ name: this._datas[i].name, recid: i });

            this._postProcessesList.refresh();

            // Canvas
            container.append("<br />");
            container.append("<hr>");
            container.append(GUI.GUIElement.CreateElement("p", SceneFactory.GenerateUUID(), "width: 100%;", "Preview:", false));

            var canvasID = SceneFactory.GenerateUUID();
            container.append(GUI.GUIElement.CreateElement("canvas", canvasID, "width: 100%; height: 300px", null, true));

            this._engine = new Engine(<HTMLCanvasElement>$("#" + canvasID)[0]);
            this._scene = new Scene(this._engine);
            this._camera = new Camera("PostProcessCamera", Vector3.Zero(), this._scene);
            this._texture = new Texture("website/Tests/textures/no_smoke.png", this._scene);
            this._engine.runRenderLoop(() => this._scene.render());

            container.append("<br />");
            container.append("<hr>");
            container.append("<br />");

            // Create build button
            var applyOrderButton = GUI.GUIElement.CreateButton(container, SceneFactory.GenerateUUID(), "Apply Chain (CTRL + B)");
            applyOrderButton.css("width", "100%");
            applyOrderButton.css("position", "absolute");
            applyOrderButton.css("bottom", "10px");
            applyOrderButton.addClass("btn-orange");
            applyOrderButton.click((event) => this._onApplyPostProcessChain(false));

            var applyOnSceneButton = GUI.GUIElement.CreateButton(container, SceneFactory.GenerateUUID(), "Apply On Scene");
            applyOnSceneButton.css("width", "100%");
            applyOnSceneButton.css("position", "absolute");
            applyOnSceneButton.css("bottom", "40px");
            applyOnSceneButton.addClass("btn-red");
            applyOnSceneButton.click((event) => this._onApplyPostProcessChain(true));

            // Editor
            this._editor = ace.edit("POST-PROCESS-BUILDER-PROGRAM");
            this._editor.setTheme("ace/theme/clouds");
            this._editor.getSession().setMode("ace/mode/javascript");
            this._editor.getSession().setValue(Effect.ShadersStore["passPixelShader"]);
            this._editor.getSession().on("change", (e) => this._onEditorChanged());

            // Console
            this._console = ace.edit("POST-PROCESS-BUILDER-CONSOLE");
            this._console.getSession().setValue("Ready.");
            
            BABYLON.Tools.Error = (entry: string) => {
                this._console.getSession().setValue(this._console.getSession().getValue() + "\n" + entry + "\n");
            };
        }

        // When the user selects an item
        private _onPostProcessSelected(selected: number[]): void {
            if (selected.length < 1)
                return;

            this._currentSelected = selected[0];
            this._editor.getSession().setValue(this._datas[selected[0]].program);
        }

        // When the user adds a new post-process
        private _onPostProcessAdd(): void {
            var inputID = SceneFactory.GenerateUUID();

            // Window
            this._selectTemplateWindow = new GUI.GUIWindow("SELECT-TEMPLATE-WINDOW", this._core, "Select template", GUI.GUIElement.CreateElement("input", inputID, "width: 100%;"), new Vector2(400, 120), ["Select", "Close"]);
            this._selectTemplateWindow.setOnCloseCallback(() => {
                this._selectTemplateWindow.destroy();
            });

            this._selectTemplateWindow.buildElement(null);

            // List
            var items: string[] = [];
            for (var thing in Effect.ShadersStore) {
                if (Effect.ShadersStore[thing].indexOf("textureSampler") !== -1)
                    items.push(thing);
            }

            var list = new GUI.GUIList(inputID, this._core);
            list.renderDrop = true;
            list.items = items;
            list.buildElement(inputID);

            // Events
            this._selectTemplateWindow.onButtonClicked = (buttonId: string) => {
                if (buttonId === "Select") {
                    var selected = list.getValue();
                    var data: IPostProcessBuilderData = { name: selected + this._datas.length, program: Effect.ShadersStore[selected] };

                    this._datas.push(data);
                    this._postProcessesList.addRecord({ name: data.name });
                    this._postProcessesList.refresh();
                }

                this._selectTemplateWindow.close();
            };
        }

        // When the user removes a post-process
        private _onPostProcessRemove(selected: number[]): void {
            var data = this._datas[selected[0]];
            if (data.postProcess) {
                this._removePostProcess(data.postProcess);
            }

            this._datas.splice(selected[0], 1);
        }

        // When the user edits a row
        private _onPostProcessEditField(recid: number, value: any): void {
            debugger;
        }

        // When the user modifies a post-process
        private _onEditorChanged(): void {
            this._datas[this._currentSelected].program = this._editor.getSession().getValue();
        }

        // When the user applies the post-process chain
        private _onApplyPostProcessChain(applyOnScene: boolean): void {
            // Clear logs
            this._console.getSession().setValue("Ready.");

            // Remove post-processes
            for (var i = 0; i < this._datas.length; i++) {
                if (this._datas[i].postProcess) {
                    this._removePostProcess(this._datas[i].postProcess);
                    delete Effect.ShadersStore[this._datas[i].postProcess.name + "PixelShader"];
                }

                if (this._datas[i].mainPostProcess && applyOnScene)
                    this._removePostProcess(this._datas[i].mainPostProcess, true);
            }

            // Apply original if on scene
            if (applyOnScene && !this._scenePassPostProcess) {
                this._scenePassPostProcess = new PassPostProcess("ScenePassPostProcess", 1.0, null, Texture.BILINEAR_SAMPLINGMODE, this._core.engine, true);
                for (var j = 0; j < this._core.currentScene.cameras.length; j++)
                    this._core.currentScene.cameras[j].attachPostProcess(this._scenePassPostProcess);
            }

            // Recreate post-processes
            for (var i = 0; i < this._datas.length; i++) {
                var data = this._datas[i];
                var id = data.name + SceneFactory.GenerateUUID();

                Effect.ShadersStore[id + "PixelShader"] = data.program;

                data.postProcess = new PostProcess(id, id, ["screenSize"], ["originalSampler"], 1.0, this._camera);
                data.postProcess.onApply = this._postProcessCallback(data.postProcess);

                if (applyOnScene) {
                    data.mainPostProcess = new PostProcess(id, id, ["screenSize"], ["originalSampler"], 1.0, null, Texture.BILINEAR_SAMPLINGMODE, this._core.engine, false);
                    data.mainPostProcess.onApply = this._postProcessCallback(data.postProcess, true);

                    for (var j = 0; j < this._core.currentScene.cameras.length; j++)
                        this._core.currentScene.cameras[j].attachPostProcess(data.mainPostProcess);
                }
            }

            SceneManager.AddCustomMetadata("PostProcessBuilder", this._datas);
        }

        // Removes the given post-process
        private _removePostProcess(postProcess: PostProcess, applyOnScene: boolean = false): void {
            this._camera.detachPostProcess(postProcess);

            if (applyOnScene) {
                for (var i = 0; i < this._core.currentScene.cameras.length; i++)
                    this._core.currentScene.cameras[i].detachPostProcess(postProcess);
            }

            postProcess.dispose();
        }

        // Callback post-process
        private _postProcessCallback(postProcess: PostProcess, applyOnScene: boolean = false): (effect: Effect) => void {
            var screenSize = Vector2.Zero();

            return (effect: Effect) => {
                if (applyOnScene)
                    effect.setTextureFromPostProcess("originalSampler", this._scenePassPostProcess);
                else
                    effect.setTexture("originalSampler", this._texture);

                screenSize.x = postProcess.width;
                screenSize.y = postProcess.height;
                effect.setVector2("screenSize", screenSize);
            };
        }
    }
}
