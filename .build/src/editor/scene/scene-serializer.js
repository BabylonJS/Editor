"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_serializers_1 = require("babylonjs-serializers");
var window_1 = require("../gui/window");
var list_1 = require("../gui/list");
var SceneSerializer = /** @class */ (function () {
    /**
     * Constructor
     * @param scene: the scene to serializer
     */
    function SceneSerializer(scene) {
        // Create window
        var window = new window_1.default('Scene Serializer');
        window.buttons = ['Ok', 'Cancel'];
        window.width = 400;
        window.height = 125;
        window.body = "\n            <div id=\"SCENE-SERIALIZER-WINDOW\" style=\"width: 100%; height: 100%;\">\n                <label>Format: </label><div id=\"SERIALIZER-FORMAT-LIST\"></div>\n                <label>Name: </label><input type=\"text\" />\n            </div>\n        ";
        window.open();
        // Create dialog
        var list = new list_1.default('Format List');
        list.build($('#SERIALIZER-FORMAT-LIST')[0]);
        list.setItems(['GLTF', 'GLB', 'OBJ']);
        // Events
        window.onButtonClick = function (id) {
            if (id === 'Cancel')
                return window.close();
            debugger;
            var selected = list.getSelected();
            switch (selected) {
                case 'GLB':
                    babylonjs_serializers_1.GLTF2Export.GLB(scene, 'scene', {}).downloadFiles();
                    break;
                case 'GLTF':
                    babylonjs_serializers_1.GLTF2Export.GLTF(scene, 'scene', {}).downloadFiles();
                    break;
                case 'OBJ':
                    var obj = babylonjs_serializers_1.OBJExport.OBJ(scene.meshes, true);
                    debugger;
                    break;
                default: return;
            }
            window.close();
        };
    }
    return SceneSerializer;
}());
exports.default = SceneSerializer;
//# sourceMappingURL=scene-serializer.js.map