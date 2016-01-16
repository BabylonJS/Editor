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
        private _frameRects: Rect[] = [];
        private _frameTexts: { text: Text, bars: Rect[] }[] = [];

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            this._panel = core.editor.playLayouts.getPanelFromType("preview");
            core.editor.playLayouts.on({ type: "resize", execute: "before" }, () => {
                this._updateTimeline();
            });

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
            this._paper.setSize(this._panel.width - 17, 20);
            this._rect.attr("width", this._panel.width - 17);
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
            this.setFramesOfAnimation(null);
        }

        // Adds a frames
        public setFramesOfAnimation(animation: Animation): void {
            for (var i = 0; i < this._frameRects.length; i++)
                this._frameRects[i].remove();

            if (!animation)
                return;

            var keys = animation.getKeys();
            for (var i = 0; i < keys.length; i++) {
                var pos = this._getPosition(keys[i].frame);

                var rect = this._paper.rect(pos - 1.5, this._panel.height - 35, 3, 15);
                rect.attr("fill", "red");
                rect.attr("stroke", "black");
                this._frameRects.push(rect);
            }
        }

        // Creates the UI
        public createUI(): void {
            this._paper = Raphael(this.container, 0, 25);

            this._paper.canvas.addEventListener("mousemove", (event: MouseEvent) => {
                this._mousex = event.offsetX;
                this._mousey = event.offsetY;
            });

            // Timeline
            this._rect = this._paper.rect(0, 0, 0, 20);
            this._rect.attr("fill", Raphael.rgb(237, 241, 246));

            this._selectorRect = this._paper.rect(0, 0, 10, 20);
            this._selectorRect.attr("fill", Raphael.rgb(200, 191, 231));

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

            // Finish
            this._updateTimeline();
        }

        // Applies a tag on the 
        private _updateTimeline(): void {
            var count = 10;

            // Set frame texts
            for (var i = 0; i < this._frameTexts.length; i++) {
                this._frameTexts[i].text.remove();
                for (var j = 0; j < this._frameTexts[i].bars.length; j++) {
                    this._frameTexts[i].bars[j].remove();
                }
            }
            this._frameTexts = [];

            for (var i = 0; i < count; i++) {
                // Set text
                var decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + 1);
                var txt = this._paper.text(decal, this._panel.height - 35, BABYLON.Tools.Format(this._getFrame(decal), 0));
                txt.attr("font-family", "MS Reference Sans Serif");
                txt.attr("fill", "#555");

                // Set frame bars
                var bars: Rect[] = [];
                for (var j = 0; j < count; j++) {
                    decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + j / count);

                    var bar = this._paper.rect(decal, this._panel.height - (j === 0 ? 30 : 25), 0.25, j === 0 ? 10 : 5);
                    bar.attr("fill", Raphael.rgb(32, 32, 32));
                    bars.push(bar);
                }

                this._frameTexts.push({ text: txt, bars: bars });
            }
        }

        // Get frame from position
        private _getFrame(pos?: number): number {
            var width = this._rect.attr("width");

            if (pos)
                return (pos * this._maxFrame) / width;

            return (this._mousex * this._maxFrame) / width;
        }

        // Get a position from a frame
        private _getPosition(frame: number): number {
            var width = this._rect.attr("width");

            return (frame * width) / this._maxFrame;
        }
    }
}