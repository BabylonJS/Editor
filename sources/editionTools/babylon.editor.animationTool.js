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
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-ANIMATION"
                ];
            }
            // Object supported
            AnimationTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Node)
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
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                if (!object)
                    return;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Animations
                var animationsFolder = this._element.addFolder("Animations");
                animationsFolder.add(this, "_playAnimations").name("Play Animations");
                if (object.skeleton) {
                    var skeletonFolder = this._element.addFolder("Skeleton");
                    skeletonFolder.add(this, "_playAnimations").name("Play Animations");
                }
            };
            // Resize
            AnimationTool.prototype.resize = function () {
                this._element.width = this._editionTool.panel.width - 15;
            };
            // Plays animations
            AnimationTool.prototype._playAnimations = function () {
                var object = this.object = this._editionTool.object;
                var scene = object.getScene();
                scene.beginAnimation(object, 0, Number.MAX_VALUE, false, 0.05);
            };
            // Plays animations of skeleton
            AnimationTool.prototype._playSkeletonAnimations = function () {
                var object = this.object = this._editionTool.object;
                var scene = object.getScene();
                scene.beginAnimation(object.skeleton, 0, Number.MAX_VALUE, false, 0.05);
            };
            return AnimationTool;
        })(EDITOR.AbstractTool);
        EDITOR.AnimationTool = AnimationTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.animationTool.js.map