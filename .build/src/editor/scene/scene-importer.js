"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var tools_1 = require("../tools/tools");
var extensions_1 = require("../../extensions/extensions");
var SceneImporter = /** @class */ (function () {
    function SceneImporter() {
    }
    /**
     * Imports the project
     * @param editor: the editor reference
     * @param project: the editor project
     */
    SceneImporter.Import = function (editor, project) {
        return __awaiter(this, void 0, void 0, function () {
            var scene, m, extension;
            return __generator(this, function (_a) {
                scene = editor.core.scene;
                // Clean project (compatibility)
                this.CleanProject(project);
                // Physics
                if (!scene.isPhysicsEnabled())
                    scene.enablePhysics(scene.gravity, new babylonjs_1.CannonJSPlugin());
                // Nodes
                project.nodes.forEach(function (n) {
                    var node = null;
                    if (n.name === 'Scene') {
                        node = scene;
                    }
                    else if (n.serializationObject) {
                        switch (n.type) {
                            case 'Light':
                                node = babylonjs_1.Light.Parse(n.serializationObject, scene);
                                break;
                            case 'Mesh':
                                // Geometries
                                n.serializationObject.geometries.vertexData.forEach(function (v) {
                                    babylonjs_1.Geometry.Parse(v, scene, 'file:');
                                });
                                // Mesh
                                n.serializationObject.meshes.forEach(function (m) {
                                    node = babylonjs_1.Mesh.Parse(m, scene, 'file:');
                                });
                                break;
                            case 'Camera':
                                node = babylonjs_1.Camera.Parse(n.serializationObject, scene);
                                break;
                            default: throw new Error('Cannot parse node named: ' + n.name);
                        }
                        // Node was added
                        babylonjs_1.Tags.AddTagsTo(node, 'added');
                    }
                    else {
                        node = scene.getNodeByName(n.name);
                    }
                    // Check particle systems
                    if (!node) {
                        project.particleSystems.forEach(function (ps) {
                            if (ps.serializationObject.emitterId !== n.id)
                                return;
                            var system = babylonjs_1.ParticleSystem.Parse(ps.serializationObject, scene, 'file:');
                            if (!ps.hasEmitter) {
                                var emitter = new babylonjs_1.Mesh(n.id, scene, null, null, true);
                                emitter.id = ps.serializationObject.emitterId;
                                emitter.position = babylonjs_1.Vector3.FromArray(ps.emitterPosition);
                                system.emitter = emitter;
                                // Add tags to emitter
                                babylonjs_1.Tags.AddTagsTo(emitter, 'added_particlesystem');
                            }
                            // Legacy
                            if (ps.serializationObject.base64Texture) {
                                system.particleTexture = babylonjs_1.Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, scene);
                                system.particleTexture.name = system.particleTexture.name.replace('data:', '');
                            }
                            // Add tags to particles system
                            babylonjs_1.Tags.AddTagsTo(system, 'added');
                        });
                    }
                    // Node not found
                    if (!node)
                        return;
                    // Node animations
                    if (n.animations) {
                        n.animations.forEach(function (a) {
                            var anim = babylonjs_1.Animation.Parse(a.serializationObject);
                            babylonjs_1.Tags.AddTagsTo(anim, 'added');
                            node.animations.push(anim);
                        });
                    }
                    // Node is a Mesh?
                    if (node instanceof babylonjs_1.AbstractMesh) {
                        // Actions
                        if (n.actions) {
                            babylonjs_1.ActionManager.Parse(n.actions, node, scene);
                            babylonjs_1.Tags.AddTagsTo(node.actionManager, 'added');
                        }
                        // Physics
                        if (n.physics) {
                            node.physicsImpostor = new babylonjs_1.PhysicsImpostor(node, n.physics.physicsImpostor, {
                                mass: n.physics.physicsMass,
                                friction: n.physics.physicsFriction,
                                restitution: n.physics.physicsRestitution
                            }, scene);
                        }
                    }
                });
                // Materials
                project.materials.forEach(function (m) {
                    var material = babylonjs_1.Material.Parse(m.serializedValues, scene, 'file:');
                    m.meshesNames.forEach(function (mn) {
                        var mesh = scene.getMeshByName(mn);
                        if (mesh)
                            mesh.material = material;
                    });
                    // Material has been added
                    babylonjs_1.Tags.AddTagsTo(material, 'added');
                });
                // Shadow Generators
                project.shadowGenerators.forEach(function (sg) {
                    var generator = babylonjs_1.ShadowGenerator.Parse(sg, scene);
                    babylonjs_1.Tags.EnableFor(generator);
                    babylonjs_1.Tags.AddTagsTo(generator, 'added');
                });
                // Actions (scene)
                if (project.actions) {
                    babylonjs_1.ActionManager.Parse(project.actions, null, scene);
                    babylonjs_1.Tags.AddTagsTo(scene.actionManager, 'added');
                }
                // Metadatas
                for (m in project.customMetadatas) {
                    extension = extensions_1.default.RequestExtension(scene, m);
                    if (extension)
                        extension.onLoad(project.customMetadatas[m]);
                }
                // Finish
                scene.materials.forEach(function (m) { return m['maxSimultaneousLights'] = scene.lights.length * 2; });
                return [2 /*return*/];
            });
        });
    };
    /**
    * Cleans an editor project
    */
    SceneImporter.CleanProject = function (project) {
        project.renderTargets = project.renderTargets || [];
        project.sounds = project.sounds || [];
        project.customMetadatas = project.customMetadatas || {};
        project.physicsEnabled = project.physicsEnabled || false;
        //project.globalConfiguration.settings = project.globalConfiguration.settings || SceneFactory.Settings;
    };
    /**
     * Imports files + project
     */
    SceneImporter.ImportProject = function (editor) {
        tools_1.default.OpenFileDialog(function (files) {
            editor.filesInput.loadFiles({
                target: {
                    files: files
                }
            });
        });
    };
    return SceneImporter;
}());
exports.default = SceneImporter;
//# sourceMappingURL=scene-importer.js.map