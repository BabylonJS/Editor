"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Abstract class extension
var Extension = /** @class */ (function () {
    /**
     * Constructor
     * @param scene: the scene
     */
    function Extension(scene) {
        this.alwaysApply = false;
        this.scene = scene;
    }
    /**
     * Adds a script tag element to the dom including source URL
     * @param code: the code's text
     * @param url: the URL of the script to show in devtools
     */
    Extension.AddScript = function (code, url) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = code + '\n' + '//# sourceURL=' + url + '\n';
        document.head.appendChild(script);
        return script;
    };
    return Extension;
}());
exports.default = Extension;
//# sourceMappingURL=extension.js.map