"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Extensions = /** @class */ (function () {
    function Extensions() {
    }
    /**
     * Registers an extension
     * @param extension the extension to register
     */
    Extensions.Register = function (name, extension) {
        if (this.Extensions[name])
            return false;
        this.Extensions[name] = extension;
        return true;
    };
    /**
     * Requests an extension: returns the already created
     * if already exists
     * @param name the name of the extension
     */
    Extensions.RequestExtension = function (scene, name) {
        if (this.Instances[name])
            return this.Instances[name];
        if (!this.Extensions[name])
            return null;
        var instance = new this.Extensions[name](scene);
        this.Instances[name] = instance;
        return instance;
    };
    /**
     * Applies all extesions giving all the custom metadatas
     * @param metadatas the metadatas
     */
    Extensions.ApplyExtensions = function (scene, metadatas, rootUrl) {
        for (var e in this.Extensions) {
            var extension = new this.Extensions[e](scene);
            this.Instances[e] = extension;
            if (extension.alwaysApply || metadatas[e])
                extension.onApply(metadatas[e], rootUrl);
        }
    };
    // Public members
    Extensions.Extensions = {};
    Extensions.Instances = {};
    return Extensions;
}());
exports.default = Extensions;
//# sourceMappingURL=extensions.js.map