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
var PhysicsTool = /** @class */ (function (_super) {
    __extends(PhysicsTool, _super);
    function PhysicsTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'PHYSICS-TOOL';
        _this.tabName = 'Physics';
        // Private members
        _this._currentImpostor = '';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    PhysicsTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.Mesh || object instanceof babylonjs_1.FreeCamera;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    PhysicsTool.prototype.update = function (node) {
        var _this = this;
        _super.prototype.update.call(this, node);
        // Collisions
        var collisions = this.tool.addFolder('Collisions');
        collisions.open();
        collisions.add(node, 'checkCollisions').name('Check Collisions');
        collisions.add(node, 'collisionMask').step(0.01).name('Collision Mask');
        if (node instanceof babylonjs_1.Mesh)
            collisions.add(node, 'useOctreeForCollisions').name('Use Octree For Collisions');
        else
            this.tool.addVector(collisions, 'Ellipsoid', node.ellipsoid).open();
        // Physics
        if (node instanceof babylonjs_1.Mesh && node.getScene().isPhysicsEnabled()) {
            var physics = this.tool.addFolder('Physics');
            physics.open();
            var impostors = [
                'NoImpostor',
                'SphereImpostor',
                'BoxImpostor',
                'PlaneImpostor',
                'MeshImpostor',
                'CylinderImpostor',
                'ParticleImpostor',
                'HeightmapImpostor'
            ];
            var impostor = node.getPhysicsImpostor();
            if (!impostor)
                this._currentImpostor = impostors[0];
            else
                this._currentImpostor = impostors[impostor.type];
            physics.add(this, '_currentImpostor', impostors).name('Impostor').onFinishChange(function (r) {
                node.physicsImpostor = new babylonjs_1.PhysicsImpostor(node, babylonjs_1.PhysicsImpostor[r], { mass: 0 });
                _this.update(node);
            });
            if (impostor) {
                physics.add(impostor, 'mass').step(0.01).name('Mass');
                physics.add(impostor, 'friction').step(0.01).name('Friction');
                physics.add(impostor, 'restitution').step(0.01).name('Restitution');
            }
        }
    };
    return PhysicsTool;
}(edition_tool_1.default));
exports.default = PhysicsTool;
//# sourceMappingURL=physics-tool.js.map