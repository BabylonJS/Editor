var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractDatTool = (function (_super) {
            __extends(AbstractDatTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractDatTool(editionTool) {
                // Initialize
                _super.call(this, editionTool);
            }
            // Update
            AbstractDatTool.prototype.update = function () {
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                return true;
            };
            // Resize
            AbstractDatTool.prototype.resize = function () {
                if (this._element)
                    this._element.width = this._editionTool.panel.width - 15;
            };
            return AbstractDatTool;
        })(EDITOR.AbstractTool);
        EDITOR.AbstractDatTool = AbstractDatTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.abstractDatTool.js.map