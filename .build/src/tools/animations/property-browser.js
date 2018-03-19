"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var babylonjs_editor_1 = require("babylonjs-editor");
var PropertyBrowser = /** @class */ (function () {
    /**
     * Constructor
     * @param object: the object to traverse
     */
    function PropertyBrowser(object) {
        this._allowedTypes = [
            'Vector2', 'Vector3', 'Vector4',
            'Color3', 'Color4',
            'Quaternion',
            'Number', 'number'
        ];
        this._deepTypes = [
            babylonjs_1.Material, babylonjs_1.Camera
        ];
        // Create window
        this._window = new babylonjs_editor_1.Window('PropertyBrowser');
        this._window.body = '<div id="ANIMATION-EDITOR-PROPERTY-BORWSER" style="width: 100%; height: 100%;"></div>';
        this._window.title = 'Select Property...';
        this._window.buttons = ['Select', 'Cancel'];
        this._window.open();
        /*
        this._window.onButtonClick = (id) => {
            switch (id) {
                case 'Select':
                    const selected = this._graph.element.selected;
                    const node = <GraphNode> this._graph.element.get(selected);

                    if (node.data === undefined)
                        return;

                    if (selected && this.onSelect)
                        this.onSelect(selected);
                break;
            }

            this._graph.element.destroy();
            this._window.close();
        };
*/
        // Create graph
        this._graph = new babylonjs_editor_1.Graph('PropertyGraph');
        this._graph.build('ANIMATION-EDITOR-PROPERTY-BORWSER');
        this._fillGraph(object);
    }
    /**
     * Returns the property informations (animation type + default value)
     * @param object: the source object
     * @param propertyPath: the path to the property to animate
     */
    PropertyBrowser.prototype.getPropertyInfos = function (object, propertyPath) {
        // Get property and constructor name
        var parts = propertyPath.split('.');
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var p = parts_1[_i];
            object = object[p];
        }
        var ctor = babylonjs_editor_1.Tools.GetConstructorName(object);
        // Get animation informations according to the property
        var type = babylonjs_1.Animation.ANIMATIONTYPE_FLOAT;
        var defaultValue = 0;
        switch (ctor) {
            case 'Vector2':
                type = babylonjs_1.Animation.ANIMATIONTYPE_VECTOR2;
                defaultValue = babylonjs_1.Vector2.Zero();
                break;
            case 'Vector3':
                type = babylonjs_1.Animation.ANIMATIONTYPE_VECTOR3;
                defaultValue = babylonjs_1.Vector3.Zero();
                break;
            case 'Color3':
                type = babylonjs_1.Animation.ANIMATIONTYPE_COLOR3;
                defaultValue = babylonjs_1.Color3.Black();
                break;
            case 'Quaternion':
                type = babylonjs_1.Animation.ANIMATIONTYPE_QUATERNION;
                defaultValue = babylonjs_1.Quaternion.Identity();
                break;
        }
        return {
            type: type,
            defaultValue: defaultValue
        };
    };
    // Fills the graph with the given root object
    PropertyBrowser.prototype._fillGraph = function (root, node) {
        if (!node) {
            node = this._getPropertyNodes(root, '', {
                id: undefined,
                text: '',
                img: '',
                children: []
            });
        }
        // Sort nodes
        babylonjs_editor_1.Tools.SortAlphabetically(node.children, 'text');
        // Add for each node
        for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
            var n = _a[_i];
            this._graph.add({
                id: n.id,
                img: n.img,
                text: n.text,
                data: n.data
            }, node.id);
            this._fillGraph(root, n);
        }
    };
    // Returns an array of property nodes
    PropertyBrowser.prototype._getPropertyNodes = function (root, rootName, rootNode) {
        var _loop_1 = function (thing) {
            var value = root[thing];
            var ctor = babylonjs_editor_1.Tools.GetConstructorName(value);
            if (thing[0] === '_')
                return "continue";
            var id = "" + (rootName === '' ? '' : (rootName + '.')) + thing;
            var allowed = this_1._allowedTypes.indexOf(ctor) !== -1;
            var deep = this_1._deepTypes.find(function (dt) { return value instanceof dt; });
            if (!allowed && !deep)
                return "continue";
            // If not allowed but ok for traverse
            if (deep) {
                // Recursively add
                var node = {
                    id: id,
                    text: thing + " - (" + ctor + ")",
                    img: 'icon-error',
                    children: []
                };
                rootNode.children.push(node);
                this_1._getPropertyNodes(value, id, node);
            }
            else if (allowed) {
                var node = {
                    id: id,
                    text: thing + " - (" + ctor + ")",
                    img: this_1._getIcon(value),
                    data: value,
                    children: []
                };
                rootNode.children.push(node);
                this_1._getPropertyNodes(value, id, node);
            }
        };
        var this_1 = this;
        for (var thing in root) {
            _loop_1(thing);
        }
        return rootNode;
    };
    // Returns the appropriate icon
    PropertyBrowser.prototype._getIcon = function (obj) {
        if (obj instanceof babylonjs_1.Vector2 || obj instanceof babylonjs_1.Vector3 || obj instanceof babylonjs_1.Vector4 || obj instanceof babylonjs_1.Quaternion) {
            return 'icon-position';
        }
        else if (obj instanceof babylonjs_1.Color3 || obj instanceof babylonjs_1.Color4) {
            return 'icon-effects';
        }
        return 'icon-edit';
    };
    return PropertyBrowser;
}());
exports.default = PropertyBrowser;
//# sourceMappingURL=property-browser.js.map