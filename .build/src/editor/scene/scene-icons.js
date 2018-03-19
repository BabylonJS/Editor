"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var SceneIcons = /** @class */ (function () {
    /**
     * Constructor
     * @param editor: the editor instance
     */
    function SceneIcons(editor) {
        this.editor = editor;
        this.editor.core.updates.push(this);
        // Create scene
        this.scene = new babylonjs_1.Scene(editor.core.engine);
        this.scene.autoClear = false;
        this.scene.postProcessesEnabled = false;
        this.scene.preventDefaultOnPointerDown = false;
        // Create textures
        this.cameraTexture = this.createTexture('css/images/camera.png');
        this.lightTexture = this.createTexture('css/images/light.png');
        this.particleTexture = this.createTexture('css/images/particles.png');
        // Create material
        this.material = new babylonjs_1.StandardMaterial('SceneIcons', this.scene);
        this.material.diffuseTexture = this.lightTexture;
        this.material.emissiveColor = babylonjs_1.Color3.White();
        this.material.disableDepthWrite = false;
        this.material.disableLighting = true;
        this.scene.materials.pop();
        // Create plane
        this.plane = babylonjs_1.Mesh.CreatePlane('SceneIconsPlane', 1, this.scene, false);
        this.plane.billboardMode = babylonjs_1.Mesh.BILLBOARDMODE_ALL;
        this.scene.meshes.pop();
        this.plane.material = this.material;
    }
    /**
     * On post update the scenes
     */
    SceneIcons.prototype.onPostUpdate = function () {
        var _this = this;
        this.scene.activeCamera = this.editor.core.scene.activeCamera;
        this.scene.render();
        // Alpha testing
        var scene = this.editor.core.scene;
        var engine = this.editor.core.engine;
        // Render
        var subMesh = this.plane.subMeshes[0];
        if (!this.material.isReadyForSubMesh(this.plane, subMesh, false))
            return;
        var effect = subMesh.effect;
        if (!effect)
            return;
        var batch = this.plane._getInstancesRenderList(subMesh._id);
        engine.enableEffect(effect);
        this.plane._bind(subMesh, effect, babylonjs_1.Material.TriangleFillMode);
        // Cameras
        this.material.diffuseTexture = this.cameraTexture;
        this.renderPlane(batch, subMesh, scene.cameras, function (n) {
            if (n === scene.activeCamera)
                return false;
            _this.plane.position.copyFrom(n.position);
            return true;
        });
        // Lights
        this.material.diffuseTexture = this.lightTexture;
        this.renderPlane(batch, subMesh, scene.lights, function (n) {
            if (!n.getAbsolutePosition)
                return false;
            _this.plane.position.copyFrom(n.getAbsolutePosition());
            return true;
        });
        // Particles
        this.material.diffuseTexture = this.particleTexture;
        this.renderPlane(batch, subMesh, scene.particleSystems, function (n) {
            if (n.emitter instanceof babylonjs_1.Vector3)
                _this.plane.position.copyFrom(n.emitter);
            else if (n.emitter)
                _this.plane.position.copyFrom(n.emitter.getAbsolutePosition());
            else
                return false;
            return true;
        });
    };
    /**
     * Render the given objects
     * @param batch: the instances render list
     * @param subMesh: the submesh to render
     * @param nodes: the nodes to render
     * @param configure: callback to know if render or not the node
     */
    SceneIcons.prototype.renderPlane = function (batch, subMesh, nodes, configure) {
        var _this = this;
        var effect = subMesh.effect;
        nodes.forEach(function (n) {
            if (!configure(n))
                return;
            var distance = babylonjs_1.Vector3.Distance(_this.editor.core.scene.activeCamera.position, _this.plane.position) * 0.03;
            _this.plane.scaling = new babylonjs_1.Vector3(distance, distance, distance),
                _this.plane.computeWorldMatrix(true);
            _this.scene._cachedMaterial = null;
            _this.material._preBind(effect);
            _this.material.bindForSubMesh(_this.plane.getWorldMatrix(), _this.plane, subMesh);
            _this.plane._processRendering(subMesh, effect, babylonjs_1.Material.TriangleFillMode, batch, false, function (isInstance, world) {
                effect.setMatrix("world", world);
            });
        });
    };
    /**
     * Creates a new texture
     * @param url: the url of the texture
     */
    SceneIcons.prototype.createTexture = function (url) {
        var texture = new babylonjs_1.Texture(url, this.scene);
        texture.hasAlpha = true;
        this.scene.textures.pop();
        return texture;
    };
    return SceneIcons;
}());
exports.default = SceneIcons;
//# sourceMappingURL=scene-icons.js.map