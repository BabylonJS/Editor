module BABYLON.EDITOR {
    export class Timeline implements IEventReceiver, ICustomUpdate {
        // Public members
        public container: string = "BABYLON-EDITOR-PREVIEW-TIMELINE";
        public canvasContainer: string = "BABYLON-EDITOR-PREVIEW-TIMELINE-CANVAS";

        // Private members
        private _core: EditorCore;
        private _panel: GUI.GUIPanel;

        private _paper: Paper;
        private _rect: Rect;
        private _selectorRect: Rect;

        private _mousex: number = 0;
        private _mousey: number = 0;
        private _isOver: boolean = false;
        
        private _maxFrame = 1000;
        private _currentTime: number = 0;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            this._panel = core.editor.editPanel.panel;

            // Register this
            this._core.updates.push(this);
            this._core.eventReceivers.push(this);
        }

        // On event
        public onEvent(event: Event): boolean {

            return false;
        }
        
        // Called before rendering the scene(s)
        public onPreUpdate(): void {
            this._paper.setSize(this._panel.width - 13, 15);
            this._rect.attr("width", this._panel.width - 13);

            if (this._isOver) {
                //this._frameText.attr("text", "Frame " + this._getFrame());
                //this._frameText.attr("x", this._rect.attr("width") / 2);
                //this._core.editor.layouts.lockPanel("preview", "Frame + " + this._getFrame(), true);
            }
        }

        // Called after the scene(s) was rendered
        public onPostUpdate(): void {

        }

        // Get current time
        public get currentTime() {
            return this._currentTime;
        }

        // Reset the timeline
        public reset(): void {
            this._maxFrame = GUIAnimationEditor.GetSceneFrameCount(this._core.currentScene);
            this._currentTime = 0;
            this._selectorRect.attr("x", 0);
        }

        // Creates the UI
        public createUI(): void {
            this._paper = Raphael(this.container, 0, 15);
            this._paper.canvas.addEventListener("mousemove", (event: MouseEvent) => {
                this._mousex = event.offsetX;
                this._mousey = event.offsetY;
            });

            // Timeline
            this._rect = this._paper.rect(0, 0, 0, 15);
            this._rect.attr("fill", Raphael.rgb(220, 220, 220));

            this._selectorRect = this._paper.rect(0, 0, 5, 15);
            this._selectorRect.attr("fill", Raphael.rgb(32, 32, 32));

            // Events
            var domElement = $("#BABYLON-EDITOR-SCENE-TOOLBAR")[0];

            var click = () => {
                this._currentTime = this._getFrame();
                this._selectorRect.attr("x", this._mousex);

                GUIAnimationEditor.SetCurrentFrame(this._core.currentScene, SceneFactory.NodesToStart, this._currentTime);

                w2utils.unlock(domElement);
                w2utils.lock(domElement, { msg: "Frame " + this._currentTime, spinner: false, opacity: 0.0 });
            };

            var start = () => {
                w2utils.unlock(domElement);
                w2utils.lock(domElement, { msg: "Frame " + this._currentTime, spinner: false, opacity: 0.0 });
            };

            var end = () => {
                w2utils.unlock(domElement);
            };

            this._rect.mouseover((event: MouseEvent) => {
                this._isOver = true;
            });
            this._rect.mouseout((event: MouseEvent) => {
                this._isOver = false;
            });

            this._rect.drag(click, start, end);
            this._selectorRect.drag(click, start, end);
        }

        // Applies a tag on the 

        // Get frame from position
        private _getFrame(): number {
            var width = this._rect.attr("width");
            return (this._mousex * this._maxFrame) / width;
        }
    }
}