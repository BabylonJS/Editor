module BABYLON.EDITOR {
    export interface IEnabledPostProcesses {
        hdr: boolean;
        attachHDR: boolean;

        ssao: boolean;
        ssaoOnly: boolean;
        attachSSAO: boolean;

        standard: boolean;
        attachStandard: boolean;

        vls: boolean;
    }

    export class SceneFactory {
        // Public members
        static GenerateUUID(): string {
            /*
            var s4 = () => {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            */
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        public static get DummyNodeID(): string {
            return "BABYLON-EDITOR-DUMMY-NODE";
        }

        // Private members
        public static ConfigureObject(object: any, core: EditorCore): void {

            if (object instanceof AbstractMesh || object instanceof Scene)
                SceneManager.ConfigureObject(object, core);

            Tags.EnableFor(object);
            Tags.AddTagsTo(object, "added");

            Event.sendSceneEvent(object, SceneEventType.OBJECT_ADDED, core);
        }

        // Public members
        public static HDRPipeline: HDRRenderingPipeline = null;
        public static StandardPipeline: StandardRenderingPipeline = null;
        public static SSAOPipeline: SSAORenderingPipeline = null;
        public static VLSPostProcess: VolumetricLightScatteringPostProcess = null;
        public static EnabledPostProcesses: IEnabledPostProcesses = {
            hdr: false,
            attachHDR: true,

            ssao: false,
            ssaoOnly: false,
            attachSSAO: true,

            standard: false,
            attachStandard: true,

            vls: false
        }

        public static NodesToStart: IAnimatable[] = [];
        public static AnimationSpeed: number = 1.0;

        /**
        * Post-Processes
        */
        // Creates HDR pipeline 2
        static CreateStandardRenderingPipeline(core: EditorCore): StandardRenderingPipeline {
            if (this.StandardPipeline) {
                this.StandardPipeline.dispose();
                this.StandardPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var standard = new StandardRenderingPipeline("StandardRenderingPipeline", core.currentScene, 1.0 / devicePixelRatio, null, cameras);
            standard.lensTexture = standard.lensFlareDirtTexture = new Texture("website/textures/lensdirt.jpg", core.currentScene);
            standard.lensStarTexture = new Texture("website/textures/lensstar.png", core.currentScene);
            standard.lensColorTexture = new Texture("website/textures/lenscolor.png", core.currentScene);

            this.StandardPipeline = standard;

            return standard;
        }

        // Creates HDR pipeline
        static CreateHDRPipeline(core: EditorCore, serializationObject: any = { }): HDRRenderingPipeline {
            if (this.HDRPipeline) {
                this.HDRPipeline.dispose();
                this.HDRPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ratio: any = {
                finalRatio: 1.0,
                blurRatio: 0.25 / devicePixelRatio
            };

            var lensTexture: Texture;
            if (serializationObject.lensTexture && serializationObject.lensTexture.name) {
                lensTexture = <Texture>Texture.Parse(serializationObject.lensTexture, core.currentScene, "./");
            }
            else {
                if (serializationObject.lensTexture && serializationObject.lensTexture.base64Name) {
                    var b64LensTexutre = serializationObject.lensTexture.base64Buffer;
                    lensTexture = Texture.CreateFromBase64String(b64LensTexutre, "lensdirt.jpg", core.currentScene);
                }
                else {
                    lensTexture = new Texture("website/textures/lensdirt.jpg", core.currentScene);
                }
            }

            lensTexture.name = lensTexture.name.replace("data:", "");

            var hdr = new BABYLON.HDRRenderingPipeline("hdr", core.currentScene, ratio, null, cameras, lensTexture);
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

            var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.25 / devicePixelRatio, combineRatio: 1.0 }, cameras);
            ssao.fallOff = serializationObject.fallOff || ssao.fallOff;
            ssao.area = serializationObject.area || ssao.area;
            ssao.radius = serializationObject.radius || ssao.radius;
            ssao.totalStrength = serializationObject.totalStrength || ssao.totalStrength;
            ssao.base = serializationObject.base || ssao.base;

            this.SSAOPipeline = ssao;

            return ssao;
        }

        // Creates a Volumetric Light Scattering post-process
        static CreateVLSPostProcess(core: EditorCore, mesh: Mesh = null, serializationObject: any = {}): VolumetricLightScatteringPostProcess {
            var vls = new VolumetricLightScatteringPostProcess("vls", { passRatio: 0.5 / devicePixelRatio, postProcessRatio: 1.0 / devicePixelRatio }, core.camera, mesh, 100);
            
            if (mesh === null)
                this.ConfigureObject(vls.mesh, core);

            for (var i = 0; i < core.currentScene.cameras.length; i++) {
                if (core.currentScene.cameras[i] !== core.camera)
                    core.currentScene.cameras[i].attachPostProcess(vls);
            }

            return vls;
        }

        /**
        * Nodes
        */
        // Adds a point light
        static AddPointLight(core: EditorCore): PointLight {
            var light = new PointLight("New PointLight", new Vector3(10, 10, 10), core.currentScene);
            light.id = this.GenerateUUID();

            this.ConfigureObject(light, core);

            return light;
        }

        // Adds a directional light
        static AddDirectionalLight(core: EditorCore): DirectionalLight {
            var light = new DirectionalLight("New DirectionalLight", new Vector3(-1, -2, -1), core.currentScene);
            light.position = new Vector3(10, 10, 10);
            light.id = this.GenerateUUID();

            this.ConfigureObject(light, core);

            return light;
        }

        // Adds a spot light
        static AddSpotLight(core: EditorCore): SpotLight {
            var light = new SpotLight("New SpotLight", new Vector3(10, 10, 10), new Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
            light.id = this.GenerateUUID();

            this.ConfigureObject(light, core);

            return light;
        }

        // Adds a hemispheric light
        static AddHemisphericLight(core: EditorCore): HemisphericLight {
            var light = new HemisphericLight("New HemisphericLight", new Vector3(-1, -2, -1), core.currentScene);
            light.id = this.GenerateUUID();

            this.ConfigureObject(light, core);

            return light;
        }

        // Adds a box
        static AddBoxMesh(core: EditorCore): Mesh {
            var box = Mesh.CreateBox("New Box", 1.0, core.currentScene, false);
            box.id = this.GenerateUUID();
            
            this.ConfigureObject(box, core);

            return box;
        }

        // Adds a sphere
        static AddSphereMesh(core: EditorCore): Mesh {
            var sphere = Mesh.CreateSphere("New Sphere", 32, 1, core.currentScene, false);
            sphere.id = this.GenerateUUID();

            this.ConfigureObject(sphere, core);

            return sphere;
        }

        // Adds a plane
        static AddPlaneMesh(core: EditorCore): Mesh {
            var plane = Mesh.CreatePlane("New Plane", 1, core.currentScene, false);
            plane.rotation.x = Math.PI / 2;
            plane.id = this.GenerateUUID();

            this.ConfigureObject(plane, core);

            return plane;
        }
        
        // Adds a ground
        static AddGroundMesh(core: EditorCore): Mesh {
            var ground = Mesh.CreateGround("New Ground", 10, 10, 10, core.currentScene, false);
            ground.id = this.GenerateUUID();
            
            this.ConfigureObject(ground, core);
            
            return ground;
        }
        
        // Adds a height map
        static AddHeightMap(core: EditorCore): Mesh {
            var heightMap = Mesh.CreateGroundFromHeightMap("New Height Map", "", 10, 10, 32, 1, 1, core.currentScene, false);
            heightMap.id = this.GenerateUUID();
            
            this.ConfigureObject(heightMap, core);
            
            return heightMap;
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

                        Tools.LoadAndCreateBase64Texture("website/textures/lens6.png", core.currentScene, (texture) => {
                            flare0.texture = texture;
                            flare1.texture = texture;
                            flare2.texture = texture;
                            flare3.texture = texture;
                            flare4.texture = texture;
                            flare5.texture = texture;
                        });
                    }

                    Event.sendSceneEvent(system, SceneEventType.OBJECT_ADDED, core);
                };

                picker.open();

                return null;
            }
        }

        // Adds a lens flare to the particle system
        static AddLensFlare(core: EditorCore, system: LensFlareSystem, size: number, position: number, color: any): LensFlare {
            var flare = new BABYLON.LensFlare(size, position, color, null, system);

            return flare;
        }

        // Adds a reflection probe
        static AddReflectionProbe(core: EditorCore): ReflectionProbe {
            var rp = new ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);

            this.ConfigureObject(rp, core);

            return rp;
        }

        // Adds a render target
        static AddRenderTargetTexture(core: EditorCore): RenderTargetTexture {
            var rt = new RenderTargetTexture("New Render Target Texture", 512, core.currentScene, false);
            core.currentScene.customRenderTargets.push(rt);

            this.ConfigureObject(rt, core);

            return rt;
        }

        // Adds a skynode
        static AddSkyMesh(core: EditorCore): Mesh {
            var skyboxMaterial = new SkyMaterial("skyMaterial", core.currentScene);
            skyboxMaterial.backFaceCulling = false;

            var skybox = Mesh.CreateBox("skyBox", 1000.0, core.currentScene, false, Mesh.BACKSIDE);
            skybox.id = this.GenerateUUID();
            skybox.material = skyboxMaterial;
            
            this.ConfigureObject(skybox, core);

            return skybox;
        }

        // Adds a water mesh (with water material)
        static AddWaterMesh(core: EditorCore): Mesh {
            var waterMaterial = new WaterMaterial("waterMaterail", core.currentScene);

            Tools.LoadAndCreateBase64Texture("website/textures/normal.png", core.currentScene, (texture) => waterMaterial.bumpTexture = texture);

            var water = WaterMaterial.CreateDefaultMesh("waterMesh", core.currentScene);
            water.id = this.GenerateUUID();
            water.material = waterMaterial;
            
            this.ConfigureObject(water, core);

            // Add meshes in reflection automatically
            for (var i = 0; i < core.currentScene.meshes.length - 1; i++) {
                waterMaterial.addToRenderList(core.currentScene.meshes[i]);
            }

            return water;
        }
    }
}