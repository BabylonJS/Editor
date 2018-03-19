"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Toolbar = /** @class */ (function () {
    /**
     * Constructor
     * @param name the graph name
     */
    function Toolbar(name) {
        this.items = [];
        this.right = undefined;
        this.name = name;
    }
    /**
     * Returns if the given item is checked
     * @param id the id of the element (menu, item, etc.)
     */
    Toolbar.prototype.isChecked = function (id, justClicked) {
        if (justClicked === void 0) { justClicked = false; }
        var result = this.element.get(id);
        return justClicked ? !result['checked'] : result['checked'];
    };
    /**
     * Builds the graph
     * @param parentId the parent id
     */
    Toolbar.prototype.build = function (parentId) {
        var _this = this;
        this.element = $('#' + parentId).w2toolbar({
            name: this.name,
            items: this.items,
            onClick: function (event) {
                if (_this.onClick)
                    _this.onClick(event.target);
            },
            right: this.right
        });
    };
    return Toolbar;
}());
exports.default = Toolbar;
//# sourceMappingURL=toolbar.js.map