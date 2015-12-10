var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Storage = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Storage(core) {
                // Public members
                this.core = null;
                // Initialize
                this.core = core;
            }
            return Storage;
        })();
        EDITOR.Storage = Storage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.storage.js.map