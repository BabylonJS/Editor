var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Timeline = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Timeline(core) {
                // Public members
                this.container = "BABYLON-EDITOR-PREVIEW-TIMELINE";
                this.canvasContainer = "BABYLON-EDITOR-PREVIEW-TIMELINE-CANVAS";
                this._mousex = 0;
                this._mousey = 0;
                this._isOver = false;
                this._maxFrame = 1000;
                this._currentTime = 0;
                // Initialize
                this._core = core;
                this._panel = core.editor.editPanel.panel;
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // On event
            Timeline.prototype.onEvent = function (event) {
                return false;
            };
            // Called before rendering the scene(s)
            Timeline.prototype.onPreUpdate = function () {
                this._paper.setSize(this._panel.width - 13, 15);
                this._rect.attr("width", this._panel.width - 13);
                if (this._isOver) {
                }
            };
            // Called after the scene(s) was rendered
            Timeline.prototype.onPostUpdate = function () {
            };
            Object.defineProperty(Timeline.prototype, "currentTime", {
                // Get current time
                get: function () {
                    return this._currentTime;
                },
                enumerable: true,
                configurable: true
            });
            // Reset the timeline
            Timeline.prototype.reset = function () {
                this._maxFrame = EDITOR.GUIAnimationEditor.GetSceneFrameCount(this._core.currentScene);
                this._currentTime = 0;
                this._selectorRect.attr("x", 0);
            };
            // Creates the UI
            Timeline.prototype.createUI = function () {
                var _this = this;
                this._paper = Raphael(this.container, 0, 15);
                this._paper.canvas.addEventListener("mousemove", function (event) {
                    _this._mousex = event.offsetX;
                    _this._mousey = event.offsetY;
                });
                // Timeline
                this._rect = this._paper.rect(0, 0, 0, 15);
                this._rect.attr("fill", Raphael.rgb(220, 220, 220));
                this._selectorRect = this._paper.rect(0, 0, 5, 15);
                this._selectorRect.attr("fill", Raphael.rgb(32, 32, 32));
                // Events
                var domElement = $("#BABYLON-EDITOR-SCENE-TOOLBAR")[0];
                var click = function () {
                    _this._currentTime = _this._getFrame();
                    _this._selectorRect.attr("x", _this._mousex);
                    EDITOR.GUIAnimationEditor.SetCurrentFrame(_this._core.currentScene, EDITOR.SceneFactory.NodesToStart, _this._currentTime);
                    w2utils.unlock(domElement);
                    w2utils.lock(domElement, { msg: "Frame " + _this._currentTime, spinner: false, opacity: 0.0 });
                };
                var start = function () {
                    w2utils.unlock(domElement);
                    w2utils.lock(domElement, { msg: "Frame " + _this._currentTime, spinner: false, opacity: 0.0 });
                };
                var end = function () {
                    w2utils.unlock(domElement);
                };
                this._rect.mouseover(function (event) {
                    _this._isOver = true;
                });
                this._rect.mouseout(function (event) {
                    _this._isOver = false;
                });
                this._rect.drag(click, start, end);
                this._selectorRect.drag(click, start, end);
            };
            // Applies a tag on the 
            // Get frame from position
            Timeline.prototype._getFrame = function () {
                var width = this._rect.attr("width");
                return (this._mousex * this._maxFrame) / width;
            };
            return Timeline;
        })();
        EDITOR.Timeline = Timeline;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.timeline.js.map