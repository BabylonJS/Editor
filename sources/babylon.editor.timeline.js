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
                var _this = this;
                // Public members
                this.container = "BABYLON-EDITOR-PREVIEW-TIMELINE";
                this.animations = [];
                this._overlay = null;
                this._overlayText = null;
                this._overlayObj = null;
                this._mousex = 0;
                this._mousey = 0;
                this._isOver = false;
                this._maxFrame = 1000;
                this._currentTime = 0;
                this._frameRects = [];
                this._frameTexts = [];
                this._currentAnimationFrame = 0;
                // Initialize
                this._core = core;
                this._panel = core.editor.playLayouts.getPanelFromType("preview");
                core.editor.playLayouts.on({ type: "resize", execute: "before" }, function () {
                    _this._updateTimeline();
                });
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
                this._paper.setSize(this._panel.width - 17, 20);
                this._rect.attr("width", this._panel.width - 17);
                this._animatedRect.attr("x", this._currentAnimationFrame);
            };
            // Called after the scene(s) was rendered
            Timeline.prototype.onPostUpdate = function () {
            };
            // Starts the play mode of the timeline
            Timeline.prototype.play = function () {
                var keys = this._frameAnimation.getKeys();
                this._frameAnimation.framePerSecond = EDITOR.GUIAnimationEditor.FramesPerSecond;
                keys[0].frame = this._getFrame();
                keys[0].value = this._getPosition(this._currentTime);
                keys[1].frame = this._maxFrame;
                keys[1].value = this._getPosition(this._maxFrame);
                this._core.currentScene.beginAnimation(this, keys[0].frame, this._maxFrame, false, EDITOR.SceneFactory.AnimationSpeed);
            };
            // Stops the play mode of the timeline
            Timeline.prototype.stop = function () {
                this._core.currentScene.stopAnimation(this);
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
                this.setFramesOfAnimation(null);
                this._core.editor.playLayouts.setPanelSize("preview", EDITOR.SceneFactory.NodesToStart.length > 0 ? 40 : 0);
            };
            // Adds a frames
            Timeline.prototype.setFramesOfAnimation = function (animation) {
                for (var i = 0; i < this._frameRects.length; i++)
                    this._frameRects[i].remove();
                if (!animation)
                    return;
                var keys = animation.getKeys();
                for (var i = 0; i < keys.length; i++) {
                    var pos = this._getPosition(keys[i].frame);
                    var rect = this._paper.rect(pos - 1.5, this._panel.height - 30, 3, 10);
                    rect.attr("fill", "red");
                    rect.attr("stroke", "black");
                    this._frameRects.push(rect);
                }
            };
            // Creates the UI
            Timeline.prototype.createUI = function () {
                var _this = this;
                // Paper
                this._paper = Raphael(this.container, 0, 25);
                // Timeline
                this._rect = this._paper.rect(0, 0, 0, 20);
                this._rect.attr("fill", Raphael.rgb(237, 241, 246));
                this._selectorRect = this._paper.rect(0, 0, 10, 20);
                this._selectorRect.attr("fill", Raphael.rgb(200, 191, 231));
                this._animatedRect = this._paper.rect(0, 0, 4, 20);
                //this._animatedRect.attr("fill", Raphael.rgb(0, 0, 0));
                // Animations
                this._frameAnimation = new BABYLON.Animation("anim", "_currentAnimationFrame", 12, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                this._frameAnimation.setKeys([
                    { frame: 0, value: 0 },
                    { frame: 1, value: 1 }
                ]);
                this.animations.push(this._frameAnimation);
                // Events
                var click = function (event) {
                    _this._mousex = BABYLON.MathTools.Clamp(event.pageX - _this._paper.canvas.getBoundingClientRect().left, 0, _this._paper.width);
                    _this._mousey = BABYLON.MathTools.Clamp(event.pageY - _this._paper.canvas.getBoundingClientRect().top, 0, _this._paper.height);
                    _this._currentTime = _this._getFrame();
                    _this._selectorRect.attr("x", _this._mousex);
                    if (_this._currentTime >= 0 && _this._currentTime < _this._maxFrame - 1)
                        EDITOR.GUIAnimationEditor.SetCurrentFrame(_this._core, EDITOR.SceneFactory.NodesToStart, _this._currentTime);
                    _this._overlayText.text("Frame: " + BABYLON.Tools.Format(_this._currentTime, 0));
                    _this._overlayObj.css({ left: event.pageX });
                };
                window.addEventListener("mousemove", function (event) {
                    if (_this._isOver) {
                        click(event);
                    }
                });
                window.addEventListener("mouseup", function (event) {
                    if (_this._isOver) {
                        _this._overlayText.remove();
                    }
                    _this._isOver = false;
                });
                this._paper.canvas.addEventListener("mousedown", function (event) {
                    _this._isOver = true;
                    _this._overlay = $(_this._paper.canvas).w2overlay({ html: "<div id=\"BABYLON-EDITOR-TIMELINE-TEXT\" style=\"padding: 10px; line-height: 150%\"></div>" });
                    _this._overlayText = $("#BABYLON-EDITOR-TIMELINE-TEXT");
                    _this._overlayObj = $("#w2ui-overlay");
                    click(event);
                });
                // Finish
                this._updateTimeline();
            };
            // Applies a tag on the 
            Timeline.prototype._updateTimeline = function () {
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
                    txt.node.setAttribute("pointer-events", "none");
                    txt.node.style.msUserSelect = "none";
                    txt.node.style.webkitUserSelect = "none";
                    txt.attr("font-family", "MS Reference Sans Serif");
                    txt.attr("fill", "#555");
                    // Set frame bars
                    var bars = [];
                    for (var j = 0; j < count; j++) {
                        decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + j / count);
                        var bar = this._paper.rect(decal, this._panel.height - (j === 0 ? 30 : 25), 0.25, j === 0 ? 10 : 5);
                        bar.attr("fill", Raphael.rgb(32, 32, 32));
                        bars.push(bar);
                    }
                    this._frameTexts.push({ text: txt, bars: bars });
                }
            };
            // Get frame from position
            Timeline.prototype._getFrame = function (pos) {
                var width = this._rect.attr("width");
                if (pos)
                    return (pos * this._maxFrame) / width;
                return BABYLON.MathTools.Clamp((this._mousex * this._maxFrame) / width, 0, this._maxFrame - 1);
            };
            // Get a position from a frame
            Timeline.prototype._getPosition = function (frame) {
                var width = this._rect.attr("width");
                return (frame * width) / this._maxFrame;
            };
            return Timeline;
        })();
        EDITOR.Timeline = Timeline;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
