var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneFactory = (function () {
            function SceneFactory() {
            }
            // Public members
            SceneFactory.GenerateUUID = function () {
                var s4 = function () {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                };
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            };
            /**
            * Post-Processes
            */
            // Creates HDR pipeline
            SceneFactory.CreateHDRPipeline = function (core) {
                if (this.hdrPipeline) {
                    this.hdrPipeline.dispose();
                    this.hdrPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ratio = {
                    finalRatio: 1.0,
                    blurRatio: 1.0
                };
                var hdr = new BABYLON.HDRRenderingPipeline("hdr", core.currentScene, ratio, null, cameras, new BABYLON.Texture("textures/lensdirt.jpg", core.currentScene));
                hdr.brightThreshold = 1.0;
                hdr.gaussCoeff = 0.4;
                hdr.gaussMean = 0.0;
                hdr.gaussStandDev = 9.0;
                hdr.minimumLuminance = 0.5;
                hdr.luminanceDecreaseRate = 0.5;
                hdr.luminanceIncreaserate = 0.5;
                hdr.exposure = 1;
                hdr.gaussMultiplier = 4;
                this.hdrPipeline = hdr;
                return hdr;
            };
            // Creates SSAO pipeline
            SceneFactory.CreateSSAOPipeline = function (core) {
                if (this.ssaoPipeline) {
                    this.ssaoPipeline.dispose();
                    this.ssaoPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5, combineRatio: 1.0 }, cameras);
                ssao.fallOff = 0.000001;
                ssao.area = 0.0075;
                ssao.radius = 0.0001;
                ssao.totalStrength = 2;
                ssao.base = 1;
                this.ssaoPipeline = ssao;
                return ssao;
            };
            /**
            * Nodes
            */
            // Adds a point light
            SceneFactory.AddPointLight = function (core) {
                var light = new BABYLON.PointLight("New PointLight", new BABYLON.Vector3(10, 10, 10), core.currentScene);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a directional light
            SceneFactory.AddDirectionalLight = function (core) {
                var light = new BABYLON.DirectionalLight("New DirectionalLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.position = new BABYLON.Vector3(10, 10, 10);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a spot light
            SceneFactory.AddSpotLight = function (core) {
                var light = new BABYLON.SpotLight("New SpotLight", new BABYLON.Vector3(10, 10, 10), new BABYLON.Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a hemispheric light
            SceneFactory.AddHemisphericLight = function (core) {
                var light = new BABYLON.HemisphericLight("New HemisphericLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a particle system
            SceneFactory.AddParticleSystem = function (core, chooseEmitter) {
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                var ps = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(core.currentScene, 1000);
                ps.emitter.id = this.GenerateUUID();
                EDITOR.Event.sendSceneEvent(ps.emitter, EDITOR.SceneEventType.OBJECT_ADDED, core);
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.windowName = "Select an emitter ?";
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Reflection Probe can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var emitter = ps.emitter;
                        emitter.dispose(true);
                        EDITOR.Event.sendSceneEvent(emitter, EDITOR.SceneEventType.OBJECT_REMOVED, core);
                        ps.emitter = core.currentScene.getMeshByName(names[0]);
                        ps.emitter.attachedParticleSystem = ps;
                    };
                    picker.open();
                }
                return ps;
            };
            // Adds a reflection probe
            SceneFactory.AddReflectionProbe = function (core) {
                var rp = new BABYLON.ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);
                EDITOR.Event.sendSceneEvent(rp, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return rp;
            };
            // Adds a render target
            SceneFactory.AddRenderTargetTexture = function (core) {
                var rt = new BABYLON.RenderTargetTexture("New Render Target Texture", 512, core.currentScene, false);
                EDITOR.Event.sendSceneEvent(rt, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return rt;
            };
            // Adds a skynode
            SceneFactory.AddSkyMesh = function (core) {
                var skyboxMaterial = new BABYLON.SkyMaterial("skyMaterial", core.currentScene);
                skyboxMaterial.backFaceCulling = false;
                var skybox = BABYLON.Mesh.CreateBox("skyBox", 1000.0, core.currentScene);
                skybox.material = skyboxMaterial;
                BABYLON.Tags.EnableFor(skybox);
                BABYLON.Tags.AddTagsTo(skybox, "added");
                EDITOR.Event.sendSceneEvent(skybox, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return skybox;
            };
            // Private members
            // Public members
            SceneFactory.hdrPipeline = null;
            SceneFactory.ssaoPipeline = null;
            SceneFactory.NodesToStart = [];
            SceneFactory.AnimationSpeed = 1.0;
            return SceneFactory;
        })();
        EDITOR.SceneFactory = SceneFactory;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.sceneFactory.js.map