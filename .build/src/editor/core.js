"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var Core = /** @class */ (function () {
    /**
     * Constructor
     */
    function Core() {
        var _this = this;
        this.scenes = [];
        this.uiTextures = [];
        this.currentSelectedObject = null;
        this.updates = [];
        this.onSelectObject = new babylonjs_1.Observable();
        this.onResize = new babylonjs_1.Observable();
        this.onAddObject = new babylonjs_1.Observable();
        this.onGlobalPropertyChange = new babylonjs_1.Observable();
        // Register on events
        this.onSelectObject.add(function (object) { return _this.currentSelectedObject = object; });
    }
    /**
     * Removes the given scene from the registered scenes
     * @param scene: the scene reference to remove
     */
    Core.prototype.removeScene = function (scene, dispose) {
        var index = this.scenes.findIndex(function (s) { return s === scene; });
        if (index !== -1) {
            dispose && scene.dispose();
            this.scenes.splice(index, 1);
            return true;
        }
        return false;
    };
    /**
     * Removes the given UI (advanced texture) from the registered UIS
     * @param ui: the ui advanced texture reference to remove
     */
    Core.prototype.removeUI = function (ui) {
        var index = this.uiTextures.findIndex(function (u) { return u === ui; });
        if (index !== -1) {
            ui.dispose();
            this.scenes.splice(index, 1);
            return true;
        }
        return false;
    };
    /**
     * Updates the rendering + notify updaters
     */
    Core.prototype.update = function () {
        // On pre update
        this.updates.forEach(function (u) { return u.onPreUpdate && u.onPreUpdate(); });
        // Update (render) scenes
        this.scenes.forEach(function (s) { return s.render(); });
        // On post update
        this.updates.forEach(function (u) { return u.onPostUpdate && u.onPostUpdate(); });
    };
    return Core;
}());
exports.default = Core;
//# sourceMappingURL=core.js.map