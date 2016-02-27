var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AnimationTool = (function (_super) {
            __extends(AnimationTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AnimationTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "ANIMATION.TAB";
                // Private members
                this._animationSpeed = 1.0;
                this._loopAnimation = false;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-ANIMATION"
                ];
            }
            // Object supported
            AnimationTool.prototype.isObjectSupported = function (object) {
                if (object.animations && Array.isArray(object.animations))
                    return true;
                return false;
            };
            // Creates the UI
            AnimationTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Animations" });
            };
            // Update
            AnimationTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Edit animations
                this._element.add(this, "_editAnimations").name("Edit Animations");
                // Animations
                var animationsFolder = this._element.addFolder("Play Animations");
                animationsFolder.add(this, "_playAnimations").name("Play Animations");
                animationsFolder.add(this, "_animationSpeed").min(0).name("Speed");
                animationsFolder.add(this, "_loopAnimation").name("Loop");
                if (object instanceof BABYLON.AbstractMesh && object.skeleton) {
                    var skeletonFolder = this._element.addFolder("Skeleton");
                    skeletonFolder.add(this, "_playSkeletonAnimations").name("Play Animations");
                }
                return true;
            };
            // Loads the animations tool
            AnimationTool.prototype._editAnimations = function () {
                var animCreator = new EDITOR.GUIAnimationEditor(this._editionTool.core, this.object);
            };
            // Plays animations
            AnimationTool.prototype._playAnimations = function () {
                this._editionTool.core.currentScene.beginAnimation(this.object, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            // Plays animations of skeleton
            AnimationTool.prototype._playSkeletonAnimations = function () {
                var object = this.object = this._editionTool.object;
                var scene = object.getScene();
                scene.beginAnimation(object.skeleton, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            return AnimationTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.AnimationTool = AnimationTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
