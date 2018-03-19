"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var babylonjs_materials_1 = require("babylonjs-materials");
var tools_1 = require("../tools/tools");
var picker_1 = require("../gui/picker");
var SceneFactory = /** @class */ (function () {
    function SceneFactory() {
    }
    /**
     * Adds the given node to the scene's graph (on the right)
     * @param editor the editor reference
     * @param node the node to add
     */
    SceneFactory.AddToGraph = function (editor, node) {
        var selected = editor.graph.getSelected();
        editor.graph.clear();
        editor.graph.fill();
        editor.graph.select(selected ? selected : editor.graph.root);
        editor.graph.select(node.id);
    };
    /**
     * Creates a new default particle system
     * @param editor: the editor reference
     * @param emitter: the emitter of the system
     */
    SceneFactory.CreateDefaultParticleSystem = function (editor, spriteSheetEnabled, emitter) {
        var _this = this;
        // Misc
        var scene = editor.core.scene;
        // Create system
        var system = new babylonjs_1.ParticleSystem('New Particle System', 10000, scene, null, spriteSheetEnabled);
        system.id = babylonjs_1.Tools.RandomId();
        if (!emitter) {
            tools_1.default.CreateFileFromURL('assets/textures/flare.png').then(function () {
                system.particleTexture = new babylonjs_1.Texture('file:flare.png', scene);
                system.particleTexture.name = system.particleTexture.url = 'flare.png';
            });
        }
        system.minAngularSpeed = -0.5;
        system.maxAngularSpeed = 0.5;
        system.minSize = 0.1;
        system.maxSize = 0.5;
        system.minLifeTime = 0.5;
        system.maxLifeTime = 2.0;
        system.minEmitPower = 0.5;
        system.maxEmitPower = 4.0;
        system.emitRate = 400;
        system.blendMode = babylonjs_1.ParticleSystem.BLENDMODE_ONEONE;
        system.minEmitBox = new babylonjs_1.Vector3(0, 0, 0);
        system.maxEmitBox = new babylonjs_1.Vector3(0, 0, 0);
        system.direction1 = new babylonjs_1.Vector3(-1, 1, -1);
        system.direction2 = new babylonjs_1.Vector3(1, 1, 1);
        system.color1 = new babylonjs_1.Color4(1, 0, 0, 1);
        system.color2 = new babylonjs_1.Color4(0, 1, 1, 1);
        system.gravity = new babylonjs_1.Vector3(0, -2.0, 0);
        system.start();
        // Emitter
        if (emitter) {
            system.emitter = emitter;
            return system;
        }
        var picker = new picker_1.default('Choose Emitter');
        picker.addItems(scene.meshes);
        picker.open(function (items) {
            var emitter = items.length > 0 ? scene.getNodeByName(items[0].name) : null;
            if (!emitter) {
                emitter = new babylonjs_1.Mesh('New Particle System Emitter', scene);
                emitter.id = babylonjs_1.Tools.RandomId();
                babylonjs_1.Tags.AddTagsTo(emitter, 'added_particlesystem');
            }
            system.emitter = emitter;
            _this.AddToGraph(editor, system);
        });
        return system;
    };
    /**
     * Creates a skybox with a sky effect on it (SkyMaterial)
     * @param editor the editor reference
     */
    SceneFactory.CreateSkyEffect = function (editor) {
        var skybox = babylonjs_1.Mesh.CreateBox('SkyBox', 5000, editor.core.scene, false, babylonjs_1.Mesh.BACKSIDE);
        skybox.material = new babylonjs_materials_1.SkyMaterial('Sky Material ' + babylonjs_1.Tools.RandomId(), editor.core.scene);
        this.AddToGraph(editor, skybox);
        return skybox;
    };
    /**
     * Creates a new mesh (if createGround set to true) with a water material assigned
     * the water will reflect all the scene's meshes
     * @param editor the editor reference
     */
    SceneFactory.CreateWaterEffect = function (editor, createGround) {
        if (createGround === void 0) { createGround = true; }
        var material = new babylonjs_materials_1.WaterMaterial('New Water Material', editor.core.scene);
        editor.core.scene.meshes.forEach(function (m) { return material.addToRenderList(m); });
        tools_1.default.CreateFileFromURL('assets/textures/normal.png').then(function () {
            material.bumpTexture = new babylonjs_1.Texture('file:normal.png', editor.core.scene);
            material.bumpTexture.name = material.bumpTexture['url'] = 'normal.png';
        });
        if (createGround) {
            var mesh = babylonjs_1.Mesh.CreateGround('New Water Mesh', 512, 512, 32, editor.core.scene);
            mesh.material = material;
            this.AddToGraph(editor, mesh);
        }
        return material;
    };
    /**
     * Creates a new ground mesh
     * @param editor: the editor reference
     */
    SceneFactory.CreateGroundMesh = function (editor) {
        var mesh = babylonjs_1.Mesh.CreateGround('New Ground', 512, 512, 32, editor.core.scene, true);
        this.AddToGraph(editor, mesh);
        return mesh;
    };
    return SceneFactory;
}());
exports.default = SceneFactory;
//# sourceMappingURL=scene-factory.js.map