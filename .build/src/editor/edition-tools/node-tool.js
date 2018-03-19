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
var edition_tool_1 = require("./edition-tool");
var scene_manager_1 = require("../scene/scene-manager");
var NodeTool = /** @class */ (function (_super) {
    __extends(NodeTool, _super);
    function NodeTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'NODE-TOOL';
        _this.tabName = 'Node';
        // Private members
        _this._parentId = '';
        _this._enabled = true;
        _this._currentCamera = false;
        return _this;
    }
    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    NodeTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.Node || object instanceof babylonjs_1.SubMesh;
    };
    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    NodeTool.prototype.update = function (object) {
        var _this = this;
        // Get node
        var node = object instanceof babylonjs_1.SubMesh ? object.getMesh() : object;
        _super.prototype.update.call(this, node);
        // Misc.
        var scene = node.getScene();
        this._enabled = node.isEnabled();
        // Common
        var common = this.tool.addFolder('Common');
        common.open();
        common.add(node, 'name').name('Name').onFinishChange(function (r) { return _this.editor.graph.renameNode(node.id, r); });
        common.add(this, '_enabled').name('Enabled').onFinishChange(function (r) { return node.setEnabled(r); });
        // Parenting
        var parenting = this.tool.addFolder('Parenting');
        parenting.open();
        var parents = ['None'];
        scene.meshes.forEach(function (m) { return m.name !== node.name && parents.push(m.name); });
        scene.lights.forEach(function (l) { return l.name !== node.name && parents.push(l.name); });
        scene.cameras.forEach(function (c) { return c.name !== node.name && parents.push(c.name); });
        this._parentId = node.parent ? node.parent.id : parents[0];
        parenting.add(this, '_parentId', parents).name('Parent').onChange(function (n) {
            node.parent = scene.getNodeByName(n);
            _this.editor.graph.setParent(node.id, node.parent ? node.parent.id : _this.editor.graph.root);
        });
        // Transforms
        var transforms = this.tool.addFolder('Transfroms');
        transforms.open();
        if (node['position'])
            this.tool.addVector(transforms, 'Position', node['position']).open();
        if (node['rotation'])
            this.tool.addVector(transforms, 'Rotation', node['rotation']).open();
        if (node['scaling'])
            this.tool.addVector(transforms, 'Scaling', node['scaling']).open();
        if (node['direction'])
            this.tool.addVector(transforms, 'Direction', node['direction']).open();
        // Abstract mesh
        if (node instanceof babylonjs_1.AbstractMesh) {
            // Collisions
            var collisions = this.tool.addFolder('Collisions');
            collisions.open();
            collisions.add(node, 'checkCollisions').name('Check Collisions');
            collisions.add(node, 'isBlocker').name('Is Blocker');
            // Rendering
            var rendering = this.tool.addFolder('Rendering');
            rendering.open();
            rendering.add(node, 'receiveShadows').name('Receive Shadows');
            rendering.add(node, 'applyFog').name('Apply Fog');
            rendering.add(node, 'isVisible').name('Is Visible');
            if (!(node instanceof babylonjs_1.InstancedMesh)) {
                // Instances
                var instances = this.tool.addFolder('Instances');
                instances.open();
                instances.add(this, 'createInstance').name('Create Instance...');
            }
        }
        else if (node instanceof babylonjs_1.Camera) {
            this._currentCamera = scene.activeCamera === node;
            var camera = this.tool.addFolder('Camera');
            camera.open();
            camera.add(this, '_currentCamera').name('Active Camera').onFinishChange(function (r) {
                scene.activeCamera = r ? node : _this.editor.camera;
            });
            if (node['speed'] !== undefined)
                camera.add(node, 'speed').step(0.01).name('Speed');
            camera.add(node, 'minZ').step(0.01).name('Min Z');
            camera.add(node, 'maxZ').step(0.01).name('Max Z');
            camera.add(node, 'fov').step(0.01).name('Fov');
        }
        // Animations
        if (node.animations && node.animations.length > 0 || (node instanceof babylonjs_1.Mesh && node.skeleton)) {
            var animations = this.tool.addFolder('Animations');
            animations.open();
            animations.add(this, 'playAnimations').name('Play Animations');
        }
    };
    /**
     * Creates a new instance
     */
    NodeTool.prototype.createInstance = function () {
        var instance = this.object.createInstance('New instance ' + babylonjs_1.Tools.RandomId());
        instance.id = babylonjs_1.Tools.RandomId();
        this.editor.graph.add({
            id: instance.id,
            img: this.editor.graph.getIcon(instance),
            text: instance.name,
            data: instance,
            count: 0
        }, this.object.id);
        this.editor.edition.setObject(instance);
        this.editor.graph.select(instance.id);
    };
    /**
     * Plays the animations of the current node
     * (including skeleton if exists)
     */
    NodeTool.prototype.playAnimations = function () {
        var scene = this.editor.core.scene;
        if (this.object.animations && this.object.animations.length > 0) {
            var bounds = scene_manager_1.default.GetAnimationFrameBounds([this.object]);
            scene.stopAnimation(this.object);
            scene.beginAnimation(this.object, bounds.min, bounds.max, false, 1.0);
        }
        if (this.object instanceof babylonjs_1.Mesh && this.object.skeleton) {
            var bounds = scene_manager_1.default.GetAnimationFrameBounds(this.object.skeleton.bones);
            scene.stopAnimation(this.object.skeleton);
            scene.beginAnimation(this.object.skeleton, bounds.min, bounds.max, false, 1.0);
        }
    };
    return NodeTool;
}(edition_tool_1.default));
exports.default = NodeTool;
//# sourceMappingURL=node-tool.js.map