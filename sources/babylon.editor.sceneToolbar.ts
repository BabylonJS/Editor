module BABYLON.EDITOR {
    export class SceneToolbar implements IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-SCENE-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        private _wireframeID: string = "WIREFRAME";
        private _centerOnObjectID: string = "CENTER-ON-OBJECT";

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
                    var wireframe = false;

                    if (checked)
                        wireframe = true;

                    for (var i = 0; i < scene.materials.length; i++) {
                        scene.materials[i].wireframe = wireframe;
                    }

                    this.toolbar.setItemChecked(id, checked);

                    return true;
                }
                else if (id.indexOf(this._centerOnObjectID) !== -1) {
                    var object: any = this._core.editor.sceneGraphTool.sidebar.getSelectedData();
                    if (!object || !object.position)
                        return true;

                    var camera = this._core.camera;

                    var keys = [
                        {
                            frame: 0,
                            value: camera.target
                        }, {
                            frame: 1,
                            value: object.getAbsolutePosition ? object.getAbsolutePosition() : object.position
                        }
                    ];

                    var animation = new Animation("FocusOnObjectAnimation", "target", 10, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
                    animation.setKeys(keys);

                    scene.stopAnimation(camera);
                    scene.beginDirectAnimation(camera, [animation], 0, 1, false, 1);
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
            this.toolbar.createMenu("button", this._centerOnObjectID, "Focus object", "icon-focus");
            this.toolbar.addBreak();

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
