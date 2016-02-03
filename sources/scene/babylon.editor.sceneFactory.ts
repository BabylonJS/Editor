module BABYLON.EDITOR {
    export interface IEnabledPostProcesses {
        hdr: boolean;
        attachHDR: boolean;

        ssao: boolean;
        ssaoOnly: boolean;
        attachSSAO: boolean;
    }

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
        public static HDRPipeline: HDRRenderingPipeline = null;
        public static SSAOPipeline: SSAORenderingPipeline = null;
        public static EnabledPostProcesses: IEnabledPostProcesses = {
            hdr: false,
            attachHDR: true,

            ssao: false,
            ssaoOnly: false,
            attachSSAO: true,
        }

        public static NodesToStart: IAnimatable[] = [];
        public static AnimationSpeed: number = 1.0;

        /**
        * Post-Processes
        */
        // Creates HDR pipeline
        static CreateHDRPipeline(core: EditorCore, serializationObject: any = { }): HDRRenderingPipeline {
            if (this.HDRPipeline) {
                this.HDRPipeline.dispose();
                this.HDRPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ratio: any = {
                finalRatio: 1.0,
                blurRatio: 1.0
            };

            var hdr = new (<any>BABYLON.HDRRenderingPipeline)("hdr", core.currentScene, ratio, null, cameras, new BABYLON.Texture("textures/lensdirt.jpg", core.currentScene));
            hdr.brightThreshold = serializationObject.brightThreshold || 1.0;
            hdr.gaussCoeff = serializationObject.gaussCoeff || 0.4;
            hdr.gaussMean = serializationObject.gaussMean || 0.0;
            hdr.gaussStandDev = serializationObject.gaussStandDev || 9.0;
            hdr.minimumLuminance = serializationObject.minimumLuminance || 0.5;
            hdr.luminanceDecreaseRate = serializationObject.luminanceDecreaseRate || 0.5;
            hdr.luminanceIncreaserate = serializationObject.luminanceIncreaserate || 0.5;
            hdr.exposure = serializationObject.exposure || 1;
            hdr.gaussMultiplier = serializationObject.gaussMultiplier || 4;
            hdr.exposureAdjustment = serializationObject.exposureAdjustment || hdr.exposureAdjustment;

            this.HDRPipeline = hdr;
            return hdr;
        }

        // Creates SSAO pipeline
        static CreateSSAOPipeline(core: EditorCore, serializationObject: any = { }): SSAORenderingPipeline {
            if (this.SSAOPipeline) {
                this.SSAOPipeline.dispose();
                this.SSAOPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5, combineRatio: 1.0 }, cameras);
            ssao.fallOff = 0.000001;
            ssao.area = 0.0075;
            ssao.radius = 0.0001;
            ssao.totalStrength = 2;
            ssao.base = 1;

            this.SSAOPipeline = ssao;
            return ssao;
        }

        /**
        * Nodes
        */
        // Adds a point light
        static AddPointLight(core: EditorCore): PointLight {
            var light = new PointLight("New PointLight", new Vector3(10, 10, 10), core.currentScene);
            light.id = this.GenerateUUID();

            Tags.EnableFor(light);
            Tags.AddTagsTo(light, "added");

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a directional light
        static AddDirectionalLight(core: EditorCore): DirectionalLight {
            var light = new DirectionalLight("New DirectionalLight", new Vector3(-1, -2, -1), core.currentScene);
            light.position = new Vector3(10, 10, 10);
            light.id = this.GenerateUUID();

            Tags.EnableFor(light);
            Tags.AddTagsTo(light, "added");

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a spot light
        static AddSpotLight(core: EditorCore): SpotLight {
            var light = new SpotLight("New SpotLight", new Vector3(10, 10, 10), new Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
            light.id = this.GenerateUUID();

            Tags.EnableFor(light);
            Tags.AddTagsTo(light, "added");

            Event.sendSceneEvent(light, SceneEventType.OBJECT_ADDED, core);

            return light;
        }

        // Adds a hemispheric light
        static AddHemisphericLight(core: EditorCore): HemisphericLight {
            var light = new HemisphericLight("New HemisphericLight", new Vector3(-1, -2, -1), core.currentScene);
            light.id = this.GenerateUUID();

            Tags.EnableFor(light);
            Tags.AddTagsTo(light, "added");

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
                picker.windowName = "Select an emitter ?";

                picker.onObjectPicked = (names: string[]) => {
                    if (names.length > 1) {
                        var dialog = new GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning",
                            "A Reflection Probe can be attached to only one mesh.\n" +
                            "The first was considered as the mesh."
                        );
                        dialog.buildElement(null);
                    }

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
            Tags.EnableFor(skybox);
            Tags.AddTagsTo(skybox, "added");

            Event.sendSceneEvent(skybox, SceneEventType.OBJECT_ADDED, core);

            return skybox;
        }
    }
}