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
                if (this._hdrPipeline) {
                    this._hdrPipeline.dispose();
                    this._hdrPipeline = null;
                }
                var cameras = [core.camera];
                if (core.playCamera)
                    cameras.push(core.playCamera);
                var hdr = new BABYLON.HDRRenderingPipeline("hdr", core.currentScene, 1.0, null, cameras);
                hdr.brightThreshold = 0.5;
                hdr.gaussCoeff = 0.3;
                hdr.gaussMean = 1.0;
                hdr.gaussStandDev = 6.0;
                hdr.minimumLuminance = 0.7;
                hdr.luminanceDecreaseRate = 1.0;
                hdr.luminanceIncreaserate = 1.0;
                hdr.exposure = 1.3;
                hdr.gaussMultiplier = 4;
                this._hdrPipeline = hdr;
                return hdr;
            };
            // Creates SSAO pipeline
            SceneFactory.CreateSSAOPipeline = function (core) {
                if (this._ssaoPipeline) {
                    this._ssaoPipeline.dispose();
                    this._ssaoPipeline = null;
                }
                var cameras = [core.camera];
                if (core.playCamera)
                    cameras.push(core.playCamera);
                var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5, combineRatio: 1.0 }, cameras);
                ssao.fallOff = 0.000001;
                ssao.area = 0.0075;
                ssao.radius = 0.0002;
                ssao.totalStrength = 1;
                this._ssaoPipeline = ssao;
                return ssao;
            };
            /**
            * Nodes
            */
            // Adds a point light
            SceneFactory.AddPointLight = function (core) {
                var light = new BABYLON.PointLight("New PointLight", new BABYLON.Vector3(10, 10, 10), core.currentScene);
                light.id = this.GenerateUUID();
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a directional light
            SceneFactory.AddDirectionalLight = function (core) {
                var light = new BABYLON.DirectionalLight("New DirectionalLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.position = new BABYLON.Vector3(10, 10, 10);
                light.id = this.GenerateUUID();
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a spot light
            SceneFactory.AddSpotLight = function (core) {
                var light = new BABYLON.SpotLight("New SpotLight", new BABYLON.Vector3(10, 10, 10), new BABYLON.Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
                light.id = this.GenerateUUID();
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a hemispheric light
            SceneFactory.AddHemisphericLight = function (core) {
                var light = new BABYLON.HemisphericLight("New HemisphericLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.id = this.GenerateUUID();
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a particle system
            SceneFactory.AddParticleSystem = function (core) {
                var ps = EDITOR.GUICreateParticleSystem.CreateParticleSystem(core.currentScene, 1000);
                ps.emitter.id = this.GenerateUUID();
                EDITOR.Event.sendSceneEvent(ps.emitter, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return ps;
            };
            // Adds a reflection probe
            SceneFactory.AddReflectionProbe = function (core) {
                var rp = new BABYLON.ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);
                EDITOR.Event.sendSceneEvent(rp, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return rp;
            };
            // Private members
            SceneFactory._hdrPipeline = null;
            SceneFactory._ssaoPipeline = null;
            return SceneFactory;
        })();
        EDITOR.SceneFactory = SceneFactory;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.sceneFactory.js.map