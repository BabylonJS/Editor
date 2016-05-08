var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractTool = (function () {
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractTool(editionTool) {
                // Public members
                this.object = null;
                this.tab = "";
                // Initialize
                this._editionTool = editionTool;
            }
            // Object supported
            AbstractTool.prototype.isObjectSupported = function (object) {
                return false;
            };
            // Creates the UI
            AbstractTool.prototype.createUI = function () { };
            // Update
            AbstractTool.prototype.update = function () {
                return true;
            };
            // Apply
            AbstractTool.prototype.apply = function () { };
            // Resize
            AbstractTool.prototype.resize = function () { };
            return AbstractTool;
        })();
        EDITOR.AbstractTool = AbstractTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
