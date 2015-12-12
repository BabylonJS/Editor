module BABYLON.EDITOR {
    export class SceneFactory {
        // Public members
        static GenerateUUID(): string {
            var s4 = () => {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        }

        // Private members
        private static _hdrPipeline: HDRRenderingPipeline = null;
        private static _ssaoPipeline: SSAORenderingPipeline = null;

        /**
        * Post-Processes
        */
        // Creates HDR pipeline
        static CreateHDRPipeline(core: EditorCore): HDRRenderingPipeline {
            if (this._hdrPipeline) {
                this._hdrPipeline.dispose();
                this._hdrPipeline = null;
            }

            var cameras: Camera[] = [core.camera];
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
        }

        // Creates SSAO pipeline
        static CreateSSAOPipeline(core: EditorCore): SSAORenderingPipeline {
            if (this._ssaoPipeline) {
                this._ssaoPipeline.dispose();
                this._ssaoPipeline = null;
            }

            var cameras: Camera[] = [core.camera];
            if (core.playCamera)
                cameras.push(core.playCamera);

            var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5, combineRatio: 1.0 }, cameras);
            ssao.fallOff = 0.000001;
            ssao.area = 0.0075;
            ssao.radius = 0.0002;
            ssao.totalStrength = 1;

            this._ssaoPipeline = ssao;
            return ssao;
        }

        /**
        * Nodes
        */
        // Adds a point light
        static AddPointLight(core: EditorCore): PointLight {
            var light = new PointLight("New PointLight", new Vector3(10, 10, 10), core.currentScene);
            light.id = this.GenerateUUID();

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a directional light
        static AddDirectionalLight(core: EditorCore): DirectionalLight {
            var light = new DirectionalLight("New DirectionalLight", new Vector3(-1, -2, -1), core.currentScene);
            light.position = new Vector3(10, 10, 10);
            light.id = this.GenerateUUID();

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a spot light
        static AddSpotLight(core: EditorCore): SpotLight {
            var light = new SpotLight("New SpotLight", new Vector3(10, 10, 10), new Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
            light.id = this.GenerateUUID();

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a hemispheric light
        static AddHemisphericLight(core: EditorCore): HemisphericLight {
            var light = new HemisphericLight("New HemisphericLight", new Vector3(-1, -2, -1), core.currentScene);
            light.id = this.GenerateUUID();

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a particle system
        static AddParticleSystem(core: EditorCore): ParticleSystem {
            var ps = GUICreateParticleSystem.CreateParticleSystem(core.currentScene, 1000);
            ps.emitter.id = this.GenerateUUID();

            Event.sendSceneEvent(ps.emitter, SceneEventType.OBJECT_ADDED, core);

            return ps;
        }

        // Adds a reflection probe
        static AddReflectionProbe(core: EditorCore): ReflectionProbe {
            var rp = new ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);

            Event.sendSceneEvent(rp, SceneEventType.OBJECT_ADDED, core);

            return rp;
        }
    }
}