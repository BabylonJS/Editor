"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var edition_1 = require("../gui/edition");
var AbstractEditionTool = /** @class */ (function () {
    /**
     * Constructor
     */
    function AbstractEditionTool() {
        // Public members
        this.editor = null;
        this.object = null;
        this.tool = null;
    }
    /**
     * Updates the edition tool
     * @param object: the object to edit
     */
    AbstractEditionTool.prototype.update = function (object) {
        this.object = object;
        // Reset edition element
        if (this.tool) {
            this.tool.remove();
        }
        this.tool = new edition_1.default();
        this.tool.build(this.divId);
        this.tool.element['onResize']();
    };
    /**
     * Sets the name of the tool's tab
     * @param name the new name of the tab
     */
    AbstractEditionTool.prototype.setTabName = function (name) {
        var tab = this.editor.edition.panel.tabs.get(this.tabName);
        tab.caption = name;
        this.editor.edition.panel.tabs.refresh();
    };
    return AbstractEditionTool;
}());
exports.default = AbstractEditionTool;
//# sourceMappingURL=edition-tool.js.map