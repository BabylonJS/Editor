"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var edition_tool_1 = require("../edition-tool");
var tools_1 = require("../../tools/tools");
var MaterialTool = /** @class */ (function (_super) {
    __extends(MaterialTool, _super);
    function MaterialTool() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    MaterialTool.prototype.isSupported = function (object) {
        var supported = object instanceof babylonjs_1.Material ||
            object instanceof babylonjs_1.AbstractMesh && !!object.material ||
            object instanceof babylonjs_1.SubMesh && !!object.getMaterial();
        if (supported) {
            // Set this.object
            this.object = (object instanceof babylonjs_1.Material ? object :
                object instanceof babylonjs_1.AbstractMesh && !!object.material ? object.material :
                    object instanceof babylonjs_1.SubMesh && !!object.getMaterial() ? object.getMaterial() : null);
        }
        return supported;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    MaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        if (object instanceof babylonjs_1.Material)
            this.object = object;
        else
            this.object = object instanceof babylonjs_1.SubMesh ? object.getMaterial() : object.material;
        _super.prototype.setTabName.call(this, tools_1.default.GetConstructorName(this.object).replace('Material', ''));
        // Common
        var common = this.tool.addFolder('Common');
        common.open();
        common.add(this.object, 'name').name('Name');
        common.add(this.object, 'alpha').min(0).max(1).name('Alpha');
    };
    /**
     * Add material options
     */
    MaterialTool.prototype.addOptions = function () {
        var options = this.tool.addFolder('Options');
        options.open();
        options.add(this.object, "wireframe").name("Wire Frame");
        options.add(this.object, "fogEnabled").name("Fog Enabled");
        options.add(this.object, "backFaceCulling").name("Back Face Culling");
        options.add(this.object, "checkReadyOnEveryCall").name("Check Ready On Every Call");
        options.add(this.object, "checkReadyOnlyOnce").name("Check Ready Only Once");
        options.add(this.object, "disableDepthWrite").name("Disable Depth Write");
        this.object['useLogarithmicDepth'] = this.object['useLogarithmicDepth'] || false;
        options.add(this.object, "useLogarithmicDepth").name("Use Logarithmic Depth");
    };
    return MaterialTool;
}(edition_tool_1.default));
exports.default = MaterialTool;
//# sourceMappingURL=material-tool.js.map