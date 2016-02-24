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
                blurRatio: 0.25
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
        static AddParticleSystem(core: EditorCore, chooseEmitter: boolean = true): void {
            // Pick emitter
            if (chooseEmitter) {
                var picker = new ObjectPicker(core);
                picker.objectLists.push(core.currentScene.meshes);
                picker.objectLists.push(core.currentScene.lights);
                picker.windowName = "Select an emitter ?";
                picker.selectButtonName = "Add";
                picker.closeButtonName = "Cancel";
                picker.minSelectCount = 0;

                picker.onObjectPicked = (names: string[]) => {
                    if (names.length > 1) {
                        var dialog = new GUI.GUIDialog("ParticleSystemDialog", core, "Warning",
                            "A Particle System can be attached to only one mesh.\n" +
                            "The first was considered as the mesh."
                        );
                        dialog.buildElement(null);
                    }

                    var ps = GUIParticleSystemEditor.CreateParticleSystem(core.currentScene, 1000);
                    core.currentScene.meshes.pop();
                    ps.emitter.id = this.GenerateUUID();

                    if (names.length > 0) {
                        var emitter = ps.emitter;
                        emitter.dispose(true);

                        ps.emitter = core.currentScene.getNodeByName(names[0]);
                        Event.sendSceneEvent(ps, SceneEventType.OBJECT_ADDED, core);
                    }
                    else {
                        core.currentScene.meshes.push(ps.emitter);
                        Event.sendSceneEvent(ps.emitter, SceneEventType.OBJECT_ADDED, core);
                        Event.sendSceneEvent(ps, SceneEventType.OBJECT_ADDED, core);
                    }

                    // To remove later, today particle systems can handle animations
                    ps.emitter.attachedParticleSystem = ps;
                };

                picker.onClosedPicker = () => {

                };

                picker.open();
            }
        }

        // Adds a lens flare system
        static AddLensFlareSystem(core: EditorCore, chooseEmitter: boolean = true, emitter?: any): void {
            // Pick emitter
            if (chooseEmitter) {
                var picker = new ObjectPicker(core);
                picker.objectLists.push(core.currentScene.meshes);
                picker.objectLists.push(core.currentScene.lights);
                picker.minSelectCount = 1;
                picker.windowName = "Select an emitter...";

                picker.onObjectPicked = (names: string[]) => {
                    if (names.length > 1) {
                        var dialog = new GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning",
                            "A Lens Flare System can be attached to only one mesh.\n" +
                            "The first was considered as the mesh."
                        );
                        dialog.buildElement(null);
                    }

                    var emitter = core.currentScene.getNodeByName(names[0]);

                    if (emitter) {
                        var system = new LensFlareSystem("New Lens Flare System", emitter, core.currentScene);
                        var flare0 = SceneFactory.AddLensFlare(core, system, 0.2, 0, new Color3(1, 1, 1));
                        var flare1 = SceneFactory.AddLensFlare(core, system, 0.5, 0.2, new Color3(0.5, 0.5, 1));
                        var flare2 = SceneFactory.AddLensFlare(core, system, 0.2, 1.0, new Color3(1, 1, 1));
                        var flare3 = SceneFactory.AddLensFlare(core, system, 0.4, 0.4, new Color3(1, 0.5, 1));
                        var flare4 = SceneFactory.AddLensFlare(core, system, 0.1, 0.6, new Color3(1, 1, 1));
                        var flare5 = SceneFactory.AddLensFlare(core, system, 0.3, 0.8, new Color3(1, 1, 1));
                    }

                    Event.sendSceneEvent(system, SceneEventType.OBJECT_ADDED, core);
                };

                picker.open();

                return null;
            }
        }

        // Adds a lens flare to the particle system
        static AddLensFlare(core: EditorCore, system: LensFlareSystem, size: number, position: number, color: any): LensFlare {
            var buffer = "data:image/png;base64,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";
            var texture = Texture.CreateFromBase64String(buffer, "lens.png", core.currentScene);
            texture.name = texture.name.replace("data:", "");

            var flare = new BABYLON.LensFlare(size, position, color, null, system);
            flare.texture = texture;

            return flare;
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
            core.currentScene.customRenderTargets.push(rt);

            Event.sendSceneEvent(rt, SceneEventType.OBJECT_ADDED, core);

            return rt;
        }

        // Adds a skynode
        static AddSkyMesh(core: EditorCore): Mesh {
            var skyboxMaterial = new SkyMaterial("skyMaterial", core.currentScene);
            skyboxMaterial.backFaceCulling = false;

            var skybox = Mesh.CreateBox("skyBox", 1000.0, core.currentScene);
            skybox.id = this.GenerateUUID();
            skybox.material = skyboxMaterial;
            Tags.EnableFor(skybox);
            Tags.AddTagsTo(skybox, "added");

            Event.sendSceneEvent(skybox, SceneEventType.OBJECT_ADDED, core);

            return skybox;
        }
    }
}