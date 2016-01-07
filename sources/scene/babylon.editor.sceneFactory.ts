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

        // Public members
        public static hdrPipeline: HDRRenderingPipeline = null;
        public static ssaoPipeline: SSAORenderingPipeline = null;

        public static ParticleSystemsToStart: ParticleSystem[] = [];
        public static NodesToStart: Node[] = [];

        /**
        * Post-Processes
        */
        // Creates HDR pipeline
        static CreateHDRPipeline(core: EditorCore): HDRRenderingPipeline {
            if (this.hdrPipeline) {
                this.hdrPipeline.dispose();
                this.hdrPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ratio: any = {
                finalRatio: 1.0,
                blurRatio: 1.0
            };

            var hdr = new BABYLON.HDRRenderingPipeline("hdr", core.currentScene, ratio, null, cameras);
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
        }

        // Creates SSAO pipeline
        static CreateSSAOPipeline(core: EditorCore): SSAORenderingPipeline {
            if (this.ssaoPipeline) {
                this.ssaoPipeline.dispose();
                this.ssaoPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5, combineRatio: 1.0 }, cameras);
            ssao.fallOff = 0.000001;
            ssao.area = 0.0075;
            ssao.radius = 0.0001;
            ssao.totalStrength = 2;
            ssao.base = 1;

            this.ssaoPipeline = ssao;
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
        static AddParticleSystem(core: EditorCore, chooseEmitter: boolean = true): ParticleSystem {
            var ps = GUIParticleSystemEditor.CreateParticleSystem(core.currentScene, 1000);
            ps.emitter.id = this.GenerateUUID();

            Event.sendSceneEvent(ps.emitter, SceneEventType.OBJECT_ADDED, core);

            // Pick emitter
            if (chooseEmitter) {
                var picker = new ObjectPicker(core);
                picker.objectLists.push(core.currentScene.meshes);

                picker.onObjectPicked = (names: string[]) => {
                    if (names.length > 1) {
                        var dialog = new GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning",
                            "A Reflection Probe can be attached to only one mesh.\n" +
                            "The first was considered as the mesh."
                        );
                        dialog.buildElement(null);
                    }

                    //(<ReflectionProbe>this.object).attachToMesh(picker.core.currentScene.getMeshByName(names[0]));
                    var emitter = ps.emitter;
                    emitter.dispose(true);

                    Event.sendSceneEvent(emitter, SceneEventType.OBJECT_REMOVED, core);

                    ps.emitter = core.currentScene.getMeshByName(names[0]);
                    ps.emitter.attachedParticleSystem = ps;
                };

                picker.open();
            }

            return ps;
        }

        // Adds a reflection probe
        static AddReflectionProbe(core: EditorCore): ReflectionProbe {
            var rp = new ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);

            Event.sendSceneEvent(rp, SceneEventType.OBJECT_ADDED, core);

            return rp;
        }

        // Adds a render target
        static AddRenderTargetTexture(core: EditorCore): RenderTargetTexture {
            var rt = new RenderTargetTexture("New Render Target Texture", 512, core.currentScene, false);

            Event.sendSceneEvent(rt, SceneEventType.OBJECT_ADDED, core);

            return rt;
        }

        // Adds a skynode
        static AddSkyMesh(core: EditorCore): Mesh {
            var skyboxMaterial = new SkyMaterial("skyMaterial", core.currentScene);
            skyboxMaterial.backFaceCulling = false;

            var skybox = Mesh.CreateBox("skyBox", 1000.0, core.currentScene);
            skybox.material = skyboxMaterial;

            Event.sendSceneEvent(skybox, SceneEventType.OBJECT_ADDED, core);

            return skybox;
        }
    }
}