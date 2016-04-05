module BABYLON.EDITOR {
    export class ToolsToolbar implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-TOOLS-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        private _playGameID: string = "PLAY-GAME";

        private _transformerPositionID: string = "TRANSFORMER-POSITION";
        private _transformerRotationID: string = "TRANSFORMER-ROTATION";
        private _transformerScalingID: string = "TRANSFORMER-SCALING";

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;

            this.panel = this._editor.layouts.getPanelFromType("top");

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

                if (item === null)
                    return false;

                var transformerIndex = [this._transformerPositionID, this._transformerRotationID, this._transformerScalingID].indexOf(id);
                if (transformerIndex !== -1) {
                    var checked = this.toolbar.isItemChecked(id);

                    this.toolbar.setItemChecked(this._transformerPositionID, false);
                    this.toolbar.setItemChecked(this._transformerRotationID, false);
                    this.toolbar.setItemChecked(this._transformerScalingID, false);

                    this.toolbar.setItemChecked(id, !checked);

                    this._editor.transformer.transformerType = checked ? TransformerType.NOTHING : <TransformerType>transformerIndex;

                    return true;
                }
                else if (id.indexOf(this._playGameID) !== -1) {
                    var checked = !this.toolbar.isItemChecked(id);

                    //if (this._core.playCamera) {
                        //this._core.currentScene.activeCamera = checked ? this._core.playCamera : this._core.camera;

                    if (checked) {
                        this._core.engine.resize();
                        this._core.isPlaying = true;

                        var time = (this._editor.timeline.currentTime * 1) / GUIAnimationEditor.FramesPerSecond / SceneFactory.AnimationSpeed; 

                        // Animate at launch
                        for (var i = 0; i < SceneFactory.NodesToStart.length; i++) {
                            var node = SceneFactory.NodesToStart[i];

                            if (node instanceof Sound) {
                                (<any>node).stop();
                                (<any>node).play(0, time);
                                continue;
                            }

                            this._core.currentScene.stopAnimation(node);
                            this._core.currentScene.beginAnimation(node, this._editor.timeline.currentTime, Number.MAX_VALUE, false, SceneFactory.AnimationSpeed);
                        }
                        this._editor.timeline.play();
                    }
                    else {
                        this._core.engine.resize();

                        // Animate at launch
                        for (var i = 0; i < SceneFactory.NodesToStart.length; i++) {
                            var node = SceneFactory.NodesToStart[i];
                            this._core.currentScene.stopAnimation(node);

                            if (node instanceof Sound) {
                                (<any>node).stop();
                            }
                        }
                        this._core.editor.timeline.stop();
                    }

                    this.toolbar.setItemChecked(id, checked);

                    SceneManager.SwitchActionManager();

                    for (var i = 0; i < this._core.currentScene.meshes.length; i++)
                        this._core.currentScene.meshes[i].showBoundingBox = false;
                    //}

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
            this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game", undefined, "Play Game...");
            this.toolbar.addBreak();

            this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position", undefined, "Set Position...");
            this.toolbar.createMenu("button", this._transformerRotationID, "", "icon-rotation", undefined, "Set Rotation...");
            this.toolbar.createMenu("button", this._transformerScalingID, "", "icon-scaling", undefined, "Set Scale...");

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
