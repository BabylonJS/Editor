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
var babylonjs_gui_1 = require("babylonjs-gui");
var tools_1 = require("./tools");
var scene_factory_1 = require("../scene/scene-factory");
var DefaultScene = /** @class */ (function () {
    function DefaultScene() {
    }
    /**
     * Creates a texture file and returns the given texture
     * @param url: the url of the texture
     * @param scene: the scene where to add the texture
     */
    DefaultScene.LoadTexture = function (url, scene) {
        return __awaiter(this, void 0, void 0, function () {
            var name, texture;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, tools_1.default.CreateFileFromURL(url)];
                    case 1:
                        _a.sent();
                        name = tools_1.default.GetFilename(url);
                        texture = new babylonjs_1.Texture('file:' + name, scene);
                        texture.name = texture['url'] = name;
                        return [2 /*return*/, texture];
                }
            });
        });
    };
    /**
     * Creates a new label
     * @param gui: the gui texture
     * @param mesh: the mesh to attach
     * @param str: the string to draw
     * @param lines: if draw lines
     */
    DefaultScene.CreateLabel = function (gui, mesh, str, lines, width, height) {
        // PBR GUI
        var label = new babylonjs_gui_1.Rectangle(str);
        label.background = 'black';
        label.height = height;
        label.alpha = 0.5;
        label.width = width;
        label.cornerRadius = 20;
        label.thickness = 1;
        label.linkOffsetY = 30;
        label.top = '0%';
        label.zIndex = 5;
        label.verticalAlignment = babylonjs_gui_1.Control.VERTICAL_ALIGNMENT_TOP;
        label.horizontalAlignment = babylonjs_gui_1.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        gui.addControl(label);
        var text = new babylonjs_gui_1.TextBlock();
        text.text = str;
        text.color = 'white';
        label.addControl(text);
        if (!lines) {
            label.linkWithMesh(mesh);
            return label;
        }
        var line = new babylonjs_gui_1.Line();
        line.alpha = 0.5;
        line.lineWidth = 5;
        line.dash = [5, 10];
        gui.addControl(line);
        line.linkWithMesh(mesh);
        line.connectedControl = label;
        return label;
    };
    /**
     * Creates the default scene
     * @param scene: the scene reference where to create objects
     */
    DefaultScene.Create = function (editor) {
        return __awaiter(this, void 0, void 0, function () {
            var scene, hdrTexture, skyboxMaterial, skybox, floor, floorBump, floorAmbient, groundMaterial, ground, metal, metalBump, metalReflectivity, metalMetallic, sphereMaterialPBR, spherePBR, wood, woodReflectivity, sphereMaterialStd, sphereStd, amiga, sphereMaterialAnim, sphereAnimated, anim, documentation, planeMaterial, plane, rainEmitter, rain, _a, dropEmitter, drop, _b, spot, shadows, gui, serializedScene, serializedSceneFile;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        scene = editor.core.scene;
                        scene.clearColor = new babylonjs_1.Color4(0, 0, 0, 1);
                        // Image processing
                        scene.imageProcessingConfiguration.contrast = 1;
                        scene.imageProcessingConfiguration.exposure = 1;
                        scene.imageProcessingConfiguration.toneMappingEnabled = true;
                        hdrTexture = null;
                        skyboxMaterial = new babylonjs_1.PBRMaterial('SkyboxMaterial', scene);
                        skyboxMaterial.backFaceCulling = false;
                        skyboxMaterial.microSurface = 0.85;
                        skyboxMaterial.cameraExposure = 0.6;
                        skyboxMaterial.cameraContrast = 1.6;
                        skyboxMaterial.disableLighting = true;
                        return [4 /*yield*/, tools_1.default.CreateFileFromURL("assets/textures/environment.dds").then(function () {
                                hdrTexture = babylonjs_1.CubeTexture.CreateFromPrefilteredData("file:environment.dds", scene);
                                hdrTexture.gammaSpace = false;
                                skyboxMaterial.reflectionTexture = hdrTexture.clone();
                                skyboxMaterial.reflectionTexture.coordinatesMode = babylonjs_1.Texture.SKYBOX_MODE;
                                hdrTexture.name = hdrTexture.url = "environment.dds";
                                skyboxMaterial.reflectionTexture.name = skyboxMaterial.reflectionTexture['url'] = "environment.dds";
                            })];
                    case 1:
                        _c.sent();
                        skybox = babylonjs_1.Mesh.CreateBox("hdrSkyBox", 1000, scene);
                        skybox.material = skyboxMaterial;
                        skybox.infiniteDistance = true;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/mahogfloor_basecolor.png', scene)];
                    case 2:
                        floor = _c.sent();
                        floor.uScale = floor.vScale = 45;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/mahogfloor_normal.jpg', scene)];
                    case 3:
                        floorBump = _c.sent();
                        floorBump.uScale = floorBump.vScale = 45;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/mahogfloor_AO.jpg', scene)];
                    case 4:
                        floorAmbient = _c.sent();
                        floorAmbient.uScale = floorAmbient.vScale = 45;
                        groundMaterial = new babylonjs_1.PBRMaterial('GroundMaterial', scene);
                        groundMaterial.usePhysicalLightFalloff = false;
                        groundMaterial.microSurface = 0.93;
                        groundMaterial.albedoTexture = floor;
                        groundMaterial.bumpTexture = floorBump;
                        groundMaterial.ambientTexture = floorAmbient;
                        groundMaterial.useParallax = true;
                        groundMaterial.useParallaxOcclusion = true;
                        groundMaterial.parallaxScaleBias = 0.02;
                        groundMaterial.reflectivityColor.set(0.1, 0.1, 0.1);
                        groundMaterial.reflectionTexture = hdrTexture;
                        ground = babylonjs_1.Mesh.CreateGround('Ground', 512, 512, 32, scene);
                        ground.receiveShadows = true;
                        ground.material = groundMaterial;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/rustediron2_basecolor.png', scene)];
                    case 5:
                        metal = _c.sent();
                        return [4 /*yield*/, this.LoadTexture('assets/textures/rustediron2_normal.png', scene)];
                    case 6:
                        metalBump = _c.sent();
                        return [4 /*yield*/, this.LoadTexture('assets/textures/rustediron2_roughness.png', scene)];
                    case 7:
                        metalReflectivity = _c.sent();
                        return [4 /*yield*/, this.LoadTexture('assets/textures/rustediron2_metallic.png', scene)];
                    case 8:
                        metalMetallic = _c.sent();
                        sphereMaterialPBR = new babylonjs_1.PBRMaterial('SpherePBR', scene);
                        sphereMaterialPBR.albedoTexture = metal;
                        sphereMaterialPBR.bumpTexture = metalBump;
                        sphereMaterialPBR.reflectivityTexture = metalReflectivity;
                        sphereMaterialPBR.ambientTexture = metalMetallic;
                        sphereMaterialPBR.reflectionTexture = hdrTexture;
                        spherePBR = babylonjs_1.Mesh.CreateSphere('Sphere PBR', 32, 5, scene);
                        spherePBR.position.set(-5, 3, 0);
                        spherePBR.material = sphereMaterialPBR;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/albedo.png', scene)];
                    case 9:
                        wood = _c.sent();
                        return [4 /*yield*/, this.LoadTexture('assets/textures/reflectivity.png', scene)];
                    case 10:
                        woodReflectivity = _c.sent();
                        sphereMaterialStd = new babylonjs_1.StandardMaterial('SphereStandard', scene);
                        sphereMaterialStd.diffuseTexture = wood;
                        sphereMaterialStd.specularTexture = woodReflectivity;
                        sphereStd = babylonjs_1.Mesh.CreateSphere('Sphere Standard', 32, 5, scene);
                        sphereStd.position.set(5, 3, 0);
                        sphereStd.material = sphereMaterialStd;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/amiga.jpg', scene)];
                    case 11:
                        amiga = _c.sent();
                        sphereMaterialAnim = new babylonjs_1.StandardMaterial('SphereAnimated', scene);
                        sphereMaterialAnim.emissiveTexture = amiga;
                        sphereAnimated = babylonjs_1.Mesh.CreateSphere('Sphere Animated', 32, 5, scene);
                        sphereAnimated.position.set(15, 3, 0);
                        sphereAnimated.material = sphereMaterialAnim;
                        anim = new babylonjs_1.Animation('Rotation', 'rotation.y', 60, babylonjs_1.Animation.ANIMATIONTYPE_FLOAT, babylonjs_1.Animation.ANIMATIONLOOPMODE_CYCLE, true);
                        anim.setKeys([
                            { frame: 0, value: 0 },
                            { frame: 60, value: Math.PI },
                            { frame: 120, value: 0 },
                            { frame: 180, value: -Math.PI },
                            { frame: 240, value: 0 }
                        ]);
                        sphereAnimated.animations.push(anim);
                        anim = new babylonjs_1.Animation('Position', 'position', 60, babylonjs_1.Animation.ANIMATIONTYPE_VECTOR3, babylonjs_1.Animation.ANIMATIONLOOPMODE_CYCLE, true);
                        anim.setKeys([
                            { frame: 0, value: new babylonjs_1.Vector3(0, 0, 0) },
                            { frame: 60, value: new babylonjs_1.Vector3(0, 5, 0) },
                            { frame: 120, value: new babylonjs_1.Vector3(5, 5, 0) },
                            { frame: 180, value: new babylonjs_1.Vector3(0, 5, 5) },
                            { frame: 240, value: new babylonjs_1.Vector3(0, 0, 0) }
                        ]);
                        sphereAnimated.animations.push(anim);
                        return [4 /*yield*/, this.LoadTexture('assets/textures/documentation.png', scene)];
                    case 12:
                        documentation = _c.sent();
                        planeMaterial = new babylonjs_1.StandardMaterial('PlaneMaterial', scene);
                        planeMaterial.emissiveTexture = documentation;
                        plane = babylonjs_1.Mesh.CreatePlane('Documentation Plane', 100, scene);
                        plane.rotation.y = Math.PI;
                        plane.position.set(0, 55, -135);
                        plane.scaling.set((1280 / 800), 1, 1);
                        plane.material = planeMaterial;
                        plane.actionManager = new babylonjs_1.ActionManager(scene);
                        plane.actionManager.registerAction(new babylonjs_1.ExecuteCodeAction(babylonjs_1.ActionManager.OnDoublePickTrigger, function (evt) {
                            window.open('http://doc.babylonjs.com/resources');
                        }));
                        rainEmitter = new babylonjs_1.Mesh('Rain Particle System Emitter', scene);
                        rainEmitter.position.y = 25;
                        babylonjs_1.Tags.AddTagsTo(rainEmitter, 'added_particlesystem');
                        rain = scene_factory_1.default.CreateDefaultParticleSystem(editor, false, rainEmitter);
                        rain.name = 'Rain Particle System';
                        rain.minEmitBox.set(-50, 0, -50);
                        rain.maxEmitBox.set(50, 0, 50);
                        rain.direction1.set(0, -1, 0);
                        rain.direction2.set(0, -1, 0);
                        rain.gravity.set(0, -20, 0);
                        rain.minSize = rain.maxSize = 5;
                        rain.minLifeTime = rain.maxLifeTime = 2;
                        rain.minEmitPower = rain.maxEmitPower = 2;
                        rain.minAngularSpeed = rain.maxAngularSpeed = 0;
                        rain.color1.set(0.2, 0.2, 0.2, 0.2);
                        rain.color2.set(0.2, 0.2, 0.2, 0.2);
                        rain.colorDead.set(0.2, 0.2, 0.2, 0.2);
                        rain.emitRate = 1000;
                        rain.updateSpeed = 0.06;
                        _a = rain;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/rain.jpg', scene)];
                    case 13:
                        _a.particleTexture = _c.sent();
                        dropEmitter = new babylonjs_1.Mesh('Drop Particle System Emitter', scene);
                        dropEmitter.position.y = 1;
                        babylonjs_1.Tags.AddTagsTo(dropEmitter, 'added_particlesystem');
                        drop = scene_factory_1.default.CreateDefaultParticleSystem(editor, true, dropEmitter);
                        drop.name = 'Rain Particle System';
                        drop.minEmitBox.set(-50, 0, -50);
                        drop.maxEmitBox.set(50, 0, 50);
                        drop.direction1.set(0, 0, 0);
                        drop.direction2.set(0, 0, 0);
                        drop.gravity.set(0, 0, 0);
                        drop.minSize = drop.maxSize = 0.25;
                        drop.minLifeTime = drop.maxLifeTime = 0.03;
                        drop.minEmitPower = drop.maxEmitPower = 1;
                        drop.minAngularSpeed = drop.maxAngularSpeed = 0;
                        drop.color1.set(0.1, 0.1, 0.1, 0.1);
                        drop.color2.set(0.1, 0.1, 0.1, 0.1);
                        drop.colorDead.set(0.1, 0.1, 0.1, 0.1);
                        drop.emitRate = 5000;
                        drop.updateSpeed = 0.01;
                        drop.endSpriteCellID = 4;
                        drop.spriteCellWidth = drop.spriteCellHeight = 64;
                        drop.spriteCellChangeSpeed = 1;
                        _b = drop;
                        return [4 /*yield*/, this.LoadTexture('assets/textures/flake.bmp', scene)];
                    case 14:
                        _b.particleTexture = _c.sent();
                        spot = new babylonjs_1.SpotLight('Spot Light', new babylonjs_1.Vector3(20, 20, 20), new babylonjs_1.Vector3(-1, -2, 0), 2.4, 2.4, scene);
                        shadows = new babylonjs_1.ShadowGenerator(2048, spot, true);
                        shadows.usePoissonSampling = true;
                        shadows.getShadowMap().renderList = [spherePBR, sphereStd];
                        gui = babylonjs_gui_1.AdvancedDynamicTexture.CreateFullscreenUI('ui');
                        gui.layer.layerMask = 2;
                        editor.core.uiTextures.push(gui);
                        // Labels
                        this.CreateLabel(gui, sphereAnimated, 'Animated\nView => Animations...', false, '200px', '60px');
                        this.CreateLabel(gui, sphereStd, 'Standard Material', false, '200px', '30px');
                        this.CreateLabel(gui, spherePBR, 'PBR Material', false, '150px', '30px');
                        this.CreateLabel(gui, plane, 'Documentation (Double Click)', false, '300px', '30px');
                        this.CreateLabel(gui, rainEmitter, 'Rain Particle System', false, '300px', '30px');
                        this.CreateLabel(gui, dropEmitter, 'Drop Particle System', false, '300px', '30px');
                        serializedScene = babylonjs_1.SceneSerializer.Serialize(scene);
                        serializedSceneFile = tools_1.default.CreateFile(tools_1.default.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene.babylon');
                        babylonjs_1.FilesInput.FilesToLoad['scene.babylon'] = serializedSceneFile;
                        // Pickable
                        scene.meshes.forEach(function (m) { return m.isPickable = true; });
                        return [2 /*return*/];
                }
            });
        });
    };
    return DefaultScene;
}());
exports.default = DefaultScene;
//# sourceMappingURL=default-scene.js.map