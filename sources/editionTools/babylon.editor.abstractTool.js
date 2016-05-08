var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractTool = (function () {
            function AbstractTool(editionTool) {
                this.object = null;
                this.tab = "";
                this._editionTool = editionTool;
            }
            AbstractTool.prototype.isObjectSupported = function (object) {
                return false;
            };
            AbstractTool.prototype.createUI = function () { };
            AbstractTool.prototype.update = function () {
                return true;
            };
            AbstractTool.prototype.apply = function () { };
            AbstractTool.prototype.resize = function () { };
            return AbstractTool;
        }());
        EDITOR.AbstractTool = AbstractTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
