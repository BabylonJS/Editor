"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Layout = /** @class */ (function () {
    /**
     * Constructor
     * @param name the layout name
     */
    function Layout(name) {
        this.panels = [];
        this.name = name;
    }
    /**
     * Returns the size of the given panel
     */
    Layout.prototype.getPanelSize = function (type) {
        var panel = this.getPanelFromType(type);
        return {
            width: panel['width'],
            height: panel['height']
        };
    };
    /**
     * Locks the given panel type
     * @param type the panel type
     * @param message the message to show
     * @param showSpinner if to show a spinner
     */
    Layout.prototype.lockPanel = function (type, message, showSpinner) {
        this.element.lock(type, message, showSpinner);
    };
    /**
     * Unlocks the given panel
     * @param type the panel type
     */
    Layout.prototype.unlockPanel = function (type) {
        this.element.unlock(type);
    };
    /**
     * Returns the panel from the given type
     * @param type the panel type
     */
    Layout.prototype.getPanelFromType = function (type) {
        return this.element.get(type);
    };
    /**
     * Builds the layout
     * @param parentId the parent id
     */
    Layout.prototype.build = function (parentId) {
        this.element = $("#" + parentId).w2layout({
            name: this.name,
            panels: this.panels
        });
    };
    return Layout;
}());
exports.default = Layout;
//# sourceMappingURL=layout.js.map