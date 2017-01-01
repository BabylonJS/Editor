var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneFactory = (function () {
            function SceneFactory() {
            }
            // Public members
            SceneFactory.GenerateUUID = function () {
                /*
                var s4 = () => {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
                */
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            };
            Object.defineProperty(SceneFactory, "DummyNodeID", {
                get: function () {
                    return "BABYLON-EDITOR-DUMMY-NODE";
                },
                enumerable: true,
                configurable: true
            });
            // Private members
            SceneFactory.ConfigureObject = function (object, core) {
                if (object instanceof BABYLON.AbstractMesh || object instanceof BABYLON.Scene)
                    EDITOR.SceneManager.ConfigureObject(object, core);
                BABYLON.Tags.EnableFor(object);
                BABYLON.Tags.AddTagsTo(object, "added");
                EDITOR.Event.sendSceneEvent(object, EDITOR.SceneEventType.OBJECT_ADDED, core);
            };
            /**
            * Post-Processes
            */
            // Creates HDR pipeline 2
            SceneFactory.CreateStandardRenderingPipeline = function (core) {
                if (this.StandardPipeline) {
                    this.StandardPipeline.dispose();
                    this.StandardPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var standard = new BABYLON.StandardRenderingPipeline("StandardRenderingPipeline", core.currentScene, 1.0 / devicePixelRatio, null, cameras);
                EDITOR.Tools.LoadAndCreateBase64Texture("website/textures/lensdirt.jpg", core.currentScene, function (texture) { return standard.lensTexture = standard.lensFlareDirtTexture = texture; });
                EDITOR.Tools.LoadAndCreateBase64Texture("website/textures/lensstar.png", core.currentScene, function (texture) { return standard.lensStarTexture = texture; });
                EDITOR.Tools.LoadAndCreateBase64Texture("website/textures/lenscolor.png", core.currentScene, function (texture) { return standard.lensColorTexture = texture; });
                this.StandardPipeline = standard;
                return standard;
            };
            // Creates SSAO pipeline
            SceneFactory.CreateSSAOPipeline = function (core, serializationObject) {
                if (serializationObject === void 0) { serializationObject = {}; }
                if (this.SSAOPipeline) {
                    this.SSAOPipeline.dispose();
                    this.SSAOPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.25 / devicePixelRatio, combineRatio: 1.0 }, cameras);
                ssao.fallOff = serializationObject.fallOff || ssao.fallOff;
                ssao.area = serializationObject.area || ssao.area;
                ssao.radius = serializationObject.radius || ssao.radius;
                ssao.totalStrength = serializationObject.totalStrength || ssao.totalStrength;
                ssao.base = serializationObject.base || ssao.base;
                this.SSAOPipeline = ssao;
                return ssao;
            };
            // Creates a Volumetric Light Scattering post-process
            SceneFactory.CreateVLSPostProcess = function (core, mesh, serializationObject) {
                if (mesh === void 0) { mesh = null; }
                if (serializationObject === void 0) { serializationObject = {}; }
                var vls = new BABYLON.VolumetricLightScatteringPostProcess("vls", { passRatio: 0.5 / devicePixelRatio, postProcessRatio: 1.0 / devicePixelRatio }, core.camera, mesh, 100);
                if (mesh === null)
                    this.ConfigureObject(vls.mesh, core);
                for (var i = 0; i < core.currentScene.cameras.length; i++) {
                    if (core.currentScene.cameras[i] !== core.camera)
                        core.currentScene.cameras[i].attachPostProcess(vls);
                }
                return vls;
            };
            /**
            * Nodes
            */
            // Adds a point light
            SceneFactory.AddPointLight = function (core) {
                var light = new BABYLON.PointLight("New PointLight", new BABYLON.Vector3(10, 10, 10), core.currentScene);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a directional light
            SceneFactory.AddDirectionalLight = function (core) {
                var light = new BABYLON.DirectionalLight("New DirectionalLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.position = new BABYLON.Vector3(10, 10, 10);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a spot light
            SceneFactory.AddSpotLight = function (core) {
                var light = new BABYLON.SpotLight("New SpotLight", new BABYLON.Vector3(10, 10, 10), new BABYLON.Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a hemispheric light
            SceneFactory.AddHemisphericLight = function (core) {
                var light = new BABYLON.HemisphericLight("New HemisphericLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.id = this.GenerateUUID();
                this.ConfigureObject(light, core);
                return light;
            };
            // Adds a box
            SceneFactory.AddBoxMesh = function (core) {
                var box = BABYLON.Mesh.CreateBox("New Box", 1.0, core.currentScene, false);
                box.id = this.GenerateUUID();
                this.ConfigureObject(box, core);
                return box;
            };
            // Adds a sphere
            SceneFactory.AddSphereMesh = function (core) {
                var sphere = BABYLON.Mesh.CreateSphere("New Sphere", 32, 1, core.currentScene, false);
                sphere.id = this.GenerateUUID();
                this.ConfigureObject(sphere, core);
                return sphere;
            };
            // Adds a plane
            SceneFactory.AddPlaneMesh = function (core) {
                var plane = BABYLON.Mesh.CreatePlane("New Plane", 1, core.currentScene, false);
                plane.rotation.x = Math.PI / 2;
                plane.id = this.GenerateUUID();
                this.ConfigureObject(plane, core);
                return plane;
            };
            // Adds a ground
            SceneFactory.AddGroundMesh = function (core) {
                var ground = BABYLON.Mesh.CreateGround("New Ground", 10, 10, 10, core.currentScene, true);
                ground.id = this.GenerateUUID();
                this.ConfigureObject(ground, core);
                return ground;
            };
            // Adds a height map
            SceneFactory.AddHeightMap = function (core) {
                var heightMap = BABYLON.Mesh.CreateGroundFromHeightMap("New Height Map", "", 10, 10, 32, 1, 1, core.currentScene, false);
                heightMap.id = this.GenerateUUID();
                this.ConfigureObject(heightMap, core);
                return heightMap;
            };
            // Adds a particle system
            SceneFactory.AddParticleSystem = function (core, chooseEmitter) {
                var _this = this;
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.objectLists.push(core.currentScene.lights);
                    picker.windowName = "Select an emitter ?";
                    picker.selectButtonName = "Add";
                    picker.closeButtonName = "Cancel";
                    picker.minSelectCount = 0;
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ParticleSystemDialog", core, "Warning", "A Particle System can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var ps = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(core.currentScene, 1000);
                        core.currentScene.meshes.pop();
                        ps.emitter.id = _this.GenerateUUID();
                        if (names.length > 0) {
                            var emitter = ps.emitter;
                            emitter.dispose(true);
                            ps.emitter = core.currentScene.getNodeByName(names[0]);
                            EDITOR.Event.sendSceneEvent(ps, EDITOR.SceneEventType.OBJECT_ADDED, core);
                        }
                        else {
                            core.currentScene.meshes.push(ps.emitter);
                            EDITOR.Event.sendSceneEvent(ps.emitter, EDITOR.SceneEventType.OBJECT_ADDED, core);
                            EDITOR.Event.sendSceneEvent(ps, EDITOR.SceneEventType.OBJECT_ADDED, core);
                        }
                        // To remove later, today particle systems can handle animations
                        ps.emitter.attachedParticleSystem = ps;
                    };
                    picker.onClosedPicker = function () {
                    };
                    picker.open();
                }
            };
            // Adds a lens flare system
            SceneFactory.AddLensFlareSystem = function (core, chooseEmitter, emitter) {
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.objectLists.push(core.currentScene.lights);
                    picker.minSelectCount = 1;
                    picker.windowName = "Select an emitter...";
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Lens Flare System can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var emitter = core.currentScene.getNodeByName(names[0]);
                        if (emitter) {
                            var system = new BABYLON.LensFlareSystem("New Lens Flare System", emitter, core.currentScene);
                            var flare0 = SceneFactory.AddLensFlare(core, system, 0.2, 0, new BABYLON.Color3(1, 1, 1));
                            var flare1 = SceneFactory.AddLensFlare(core, system, 0.5, 0.2, new BABYLON.Color3(0.5, 0.5, 1));
                            var flare2 = SceneFactory.AddLensFlare(core, system, 0.2, 1.0, new BABYLON.Color3(1, 1, 1));
                            var flare3 = SceneFactory.AddLensFlare(core, system, 0.4, 0.4, new BABYLON.Color3(1, 0.5, 1));
                            var flare4 = SceneFactory.AddLensFlare(core, system, 0.1, 0.6, new BABYLON.Color3(1, 1, 1));
                            var flare5 = SceneFactory.AddLensFlare(core, system, 0.3, 0.8, new BABYLON.Color3(1, 1, 1));
                            EDITOR.Tools.LoadAndCreateBase64Texture("website/textures/lens6.png", core.currentScene, function (texture) {
                                flare0.texture = texture;
                                flare1.texture = texture;
                                flare2.texture = texture;
                                flare3.texture = texture;
                                flare4.texture = texture;
                                flare5.texture = texture;
                            });
                        }
                        EDITOR.Event.sendSceneEvent(system, EDITOR.SceneEventType.OBJECT_ADDED, core);
                    };
                    picker.open();
                    return null;
                }
            };
            // Adds a lens flare to the particle system
            SceneFactory.AddLensFlare = function (core, system, size, position, color) {
                var flare = new BABYLON.LensFlare(size, position, color, null, system);
                return flare;
            };
            // Adds a reflection probe
            SceneFactory.AddReflectionProbe = function (core) {
                var rp = new BABYLON.ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);
                this.ConfigureObject(rp, core);
                return rp;
            };
            // Adds a render target
            SceneFactory.AddRenderTargetTexture = function (core) {
                var rt = new BABYLON.RenderTargetTexture("New Render Target Texture", 512, core.currentScene, false);
                core.currentScene.customRenderTargets.push(rt);
                this.ConfigureObject(rt, core);
                return rt;
            };
            // Adds a skynode
            SceneFactory.AddSkyMesh = function (core) {
                var skyboxMaterial = new BABYLON.SkyMaterial("skyMaterial", core.currentScene);
                skyboxMaterial.backFaceCulling = false;
                var skybox = BABYLON.Mesh.CreateBox("skyBox", 1000.0, core.currentScene, false, BABYLON.Mesh.BACKSIDE);
                skybox.id = this.GenerateUUID();
                skybox.material = skyboxMaterial;
                this.ConfigureObject(skybox, core);
                return skybox;
            };
            // Adds a water mesh (with water material)
            SceneFactory.AddWaterMesh = function (core) {
                var waterMaterial = new BABYLON.WaterMaterial("waterMaterail", core.currentScene);
                EDITOR.Tools.LoadAndCreateBase64Texture("website/textures/normal.png", core.currentScene, function (texture) { return waterMaterial.bumpTexture = texture; });
                var water = BABYLON.WaterMaterial.CreateDefaultMesh("waterMesh", core.currentScene);
                water.id = this.GenerateUUID();
                water.material = waterMaterial;
                this.ConfigureObject(water, core);
                // Add meshes in reflection automatically
                for (var i = 0; i < core.currentScene.meshes.length - 1; i++) {
                    waterMaterial.addToRenderList(core.currentScene.meshes[i]);
                }
                return water;
            };
            return SceneFactory;
        }());
        // Public members
        SceneFactory.HDRPipeline = null;
        SceneFactory.StandardPipeline = null;
        SceneFactory.SSAOPipeline = null;
        SceneFactory.VLSPostProcess = null;
        SceneFactory.EnabledPostProcesses = {
            ssao: false,
            ssaoOnly: false,
            attachSSAO: true,
            standard: false,
            attachStandard: true,
            vls: false
        };
        SceneFactory.NodesToStart = [];
        SceneFactory.AnimationSpeed = 1.0;
        EDITOR.SceneFactory = SceneFactory;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.sceneFactory.js.map
