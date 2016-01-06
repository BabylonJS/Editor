var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AnimationEditor = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core
            */
            function AnimationEditor(core) {
                // Public members
                this.core = null;
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
            }
            // Event receiver
            AnimationEditor.prototype.onEvent = function (event) {
                return false;
            };
            return AnimationEditor;
        })();
        EDITOR.AnimationEditor = AnimationEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.editAnimations.js.map