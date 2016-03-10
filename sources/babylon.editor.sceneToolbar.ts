module BABYLON.EDITOR {
    export class SceneToolbar implements IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-SCENE-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;
        
        private _fpsInput: JQuery = null;

        private _wireframeID: string = "WIREFRAME";
        private _boundingBoxID: string = "BOUNDINGBOX";
        private _centerOnObjectID: string = "CENTER-ON-OBJECT";
        private _renderHelpersID: string = "RENDER-HELPERS";

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;

            this.panel = this._editor.layouts.getPanelFromType("main");

            // Register this
            this._core.updates.push(this);
            this._core.eventReceivers.push(this);
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.TOOLBAR_MENU_SELECTED) {
                if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                    return false;
                }

                var id: string = event.guiEvent.data;
                var finalID = id.split(":");
                var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);
                var scene = this._core.currentScene;

                if (item === null)
                    return false;

                if (id.indexOf(this._wireframeID) !== -1) {
                    var checked = !this.toolbar.isItemChecked(id);
                    
                    scene.forceWireframe = checked;
                    this.toolbar.setItemChecked(id, checked);

                    return true;
                }
                else if (id.indexOf(this._boundingBoxID) !== -1) {
                    var checked = !this.toolbar.isItemChecked(id);

                    scene.forceShowBoundingBoxes = checked;
                    this.toolbar.setItemChecked(id, checked);

                    return true;
                }
                else if (id.indexOf(this._renderHelpersID) !== -1) {
                    var checked = !this.toolbar.isItemChecked(id);

                    this._core.editor.renderHelpers = checked;
                    this.toolbar.setItemChecked(id, checked);

                    return true;
                }
                else if (id.indexOf(this._centerOnObjectID) !== -1) {
                    var object: any = this._core.editor.sceneGraphTool.sidebar.getSelectedData();
                    this.setFocusOnObject(object);

                    return true;
                }
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            if (this.toolbar != null)
                this.toolbar.destroy();

            this.toolbar = new GUI.GUIToolbar(this.container, this._core);

            // Play game
            this.toolbar.createMenu("button", this._wireframeID, "Wireframe", "icon-wireframe");
            this.toolbar.addBreak();
            this.toolbar.createMenu("button", this._boundingBoxID, "Bounding Box", "icon-bounding-box");
            this.toolbar.addBreak();
            this.toolbar.createMenu("button", this._renderHelpersID, "Helpers", "icon-helpers", true);
            this.toolbar.addBreak();
            this.toolbar.createMenu("button", this._centerOnObjectID, "Focus object", "icon-focus");
            this.toolbar.addBreak();

            this.toolbar.addSpacer();
            this.toolbar.createInput("SCENE-TOOLBAR-FPS", "SCENE-TOOLBAR-FPS-INPUT", "FPS :", 5);

            // Build element
            this.toolbar.buildElement(this.container);

            // Set events
            this._fpsInput = (<any>$("#SCENE-TOOLBAR-FPS-INPUT")).w2field("int", { autoFormat: true });
            this._fpsInput.change((event: JQueryEventObject) => {
                GUIAnimationEditor.FramesPerSecond = parseFloat(this._fpsInput.val());
                this._configureFramesPerSecond();
            });
            this._fpsInput.val(String(GUIAnimationEditor.FramesPerSecond));
        }

        // Sets the focus of the camera
        public setFocusOnObject(object: any): void {
            if (!object || !object.position)
                return;

            var scene = this._core.currentScene;
            var camera = this._core.camera;
            var position = object.position;

            if (object.getAbsolutePosition)
                position = object.getAbsolutePosition();

            if (object.getBoundingInfo)
                position = object.getBoundingInfo().boundingSphere.centerWorld;

            var keys = [
                {
                    frame: 0,
                    value: camera.target
                }, {
                    frame: 1,
                    value: position
                }
            ];

            var animation = new Animation("FocusOnObjectAnimation", "target", 10, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
            animation.setKeys(keys);

            scene.stopAnimation(camera);
            scene.beginDirectAnimation(camera, [animation], 0, 1, false, 1);
        }
        
        // Sets frames per second in FPS input
        public setFramesPerSecond(fps: number): void {
            this._fpsInput.val(String(fps));
            this._configureFramesPerSecond();
        }

        // Set new frames per second
        private _configureFramesPerSecond(): void {
            var setFPS = (objs: IAnimatable[]) => {
                for (var objIndex = 0; objIndex < objs.length; objIndex++) {
                    for (var animIndex = 0; animIndex < objs[objIndex].animations.length; animIndex++) {
                        objs[objIndex].animations[animIndex].framePerSecond = GUIAnimationEditor.FramesPerSecond;
                    }
                }
            };

            setFPS([this._core.currentScene]);
            setFPS(this._core.currentScene.meshes);
            setFPS(this._core.currentScene.lights);
            setFPS(this._core.currentScene.cameras);
            setFPS(this._core.currentScene.particleSystems);

            for (var sIndex = 0; sIndex < this._core.currentScene.skeletons.length; sIndex++)
                setFPS(this._core.currentScene.skeletons[sIndex].bones);
        }
    }
}
