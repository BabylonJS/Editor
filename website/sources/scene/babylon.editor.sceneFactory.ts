module BABYLON.EDITOR {
    export interface IEnabledPostProcesses {
        ssao: boolean;
        ssao2: boolean;
        standard: boolean;
        default: boolean;
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
        public static StandardPipeline: StandardRenderingPipeline = null;
        public static SSAOPipeline: SSAORenderingPipeline = null;
        public static SSAOPipeline2: SSAO2RenderingPipeline = null;
        public static DefaultPipeline: DefaultRenderingPipeline = null;
        public static VLSPostProcess: VolumetricLightScatteringPostProcess = null;
        public static EnabledPostProcesses: IEnabledPostProcesses = {
            ssao: false,
            ssao2: false,
            standard: false,
            default: false,
            vls: false
        }

        public static NodesToStart: IAnimatable[] = [];
        public static AnimationSpeed: number = 1.0;
        public static Settings: Settings = new Settings();

        /**
        * Post-Processes
        */
        // Creates HDR pipeline 2
        static CreateStandardRenderingPipeline(core: EditorCore, callback?: () => void): StandardRenderingPipeline {
            if (this.StandardPipeline) {
                this.StandardPipeline.dispose();
                this.StandardPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var standard = new StandardRenderingPipeline("StandardRenderingPipeline", core.currentScene, 1.0, null, cameras);
            Tools.LoadAndCreateBase64Texture("website/textures/lensdirt.jpg", core.currentScene, (texture) => {
                callback();
            });
            Tools.LoadAndCreateBase64Texture("website/textures/lensflaredirt.png", core.currentScene, (texture) => {
                standard.lensTexture = texture;
                standard.lensFlareDirtTexture = texture;
                callback();
            });
            Tools.LoadAndCreateBase64Texture("website/textures/lensstar.png", core.currentScene, (texture) => {
                standard.lensStarTexture = texture;
                callback();
            });
            Tools.LoadAndCreateBase64Texture("website/textures/lenscolor.png", core.currentScene, (texture) => {
                standard.lensColorTexture = texture;
                callback();
            });

            standard.lensFlareHaloWidth = 0.4;
            standard.lensFlareGhostDispersal = 0.1;
            standard.depthOfFieldDistance = 1;

            this.StandardPipeline = standard;

            return standard;
        }

        // Creates SSAO pipeline
        static CreateSSAOPipeline(core: EditorCore, serializationObject: any = { }): SSAORenderingPipeline {
            if (this.SSAOPipeline) {
                this.SSAOPipeline.dispose();
                this.SSAOPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.25, combineRatio: 1.0 }, cameras);
            ssao.fallOff = serializationObject.fallOff || ssao.fallOff;
            ssao.area = serializationObject.area || ssao.area;
            ssao.radius = serializationObject.radius || ssao.radius;
            ssao.totalStrength = serializationObject.totalStrength || ssao.totalStrength;
            ssao.base = serializationObject.base || ssao.base;

            this.SSAOPipeline = ssao;

            return ssao;
        }

        // Creates SSAO 2 pipeline
        static CreateSSAO2Pipeline(core: EditorCore, serializationObject: any = { }): SSAO2RenderingPipeline {
            if (this.SSAOPipeline2) {
                this.SSAOPipeline2.dispose();
                this.SSAOPipeline2 = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var ssaoRatio = {
                ssaoRatio: 0.5 / devicePixelRatio,
                blurRatio: 0.5 / devicePixelRatio
            };

            var ssao = new BABYLON.SSAO2RenderingPipeline("ssao", core.currentScene, ssaoRatio, cameras);
            ssao.radius = 3.5;
            ssao.totalStrength = 1.3;
            ssao.expensiveBlur = true;
            ssao.samples = 16;
            ssao.maxZ = 1000;

            this.SSAOPipeline2 = ssao;

            return ssao;
        }

        // Creates Default rendering pipeline
        static CreateDefaultPipeline(core: EditorCore): DefaultRenderingPipeline {
            if (this.DefaultPipeline) {
                this.DefaultPipeline.dispose();
                this.DefaultPipeline = null;
            }

            var cameras: Camera[] = core.currentScene.cameras;

            var defaultPipeline = new DefaultRenderingPipeline("DefaultRenderingPipeline", true, core.currentScene, cameras);
            this.DefaultPipeline = defaultPipeline;

            return defaultPipeline;
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

        // Adds a tube
        static AddCylinderMesh(core: EditorCore): Mesh {
            var tube = Mesh.CreateCylinder("New Cylinder", 5, 2, 2, 32, 32, core.currentScene);
            tube.id = this.GenerateUUID();

            this.ConfigureObject(tube, core);

            return tube;
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
            var ground = Mesh.CreateGround("New Ground", 10, 10, 10, core.currentScene, true);
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
                    (<AbstractMesh>ps.emitter).id = this.GenerateUUID();

                    if (names.length > 0) {
                        var emitter = <AbstractMesh> ps.emitter;
                        emitter.dispose(true);

                        ps.emitter = <AbstractMesh> core.currentScene.getNodeByName(names[0]);
                        Event.sendSceneEvent(ps, SceneEventType.OBJECT_ADDED, core);
                    }
                    else {
                        core.currentScene.meshes.push(<AbstractMesh> ps.emitter);
                        Event.sendSceneEvent(ps.emitter, SceneEventType.OBJECT_ADDED, core);
                        Event.sendSceneEvent(ps, SceneEventType.OBJECT_ADDED, core);
                    }
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

        // Adds a reflection texture
        static AddMirrorTexture(core: EditorCore): MirrorTexture {
            var mirror = new MirrorTexture("New Mirror Texture", 512, core.currentScene, false);
            
            this.ConfigureObject(mirror, core);

            return mirror;
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

            Tools.LoadAndCreateBase64Texture("website/textures/normal.png", core.currentScene, (texture) => {
                waterMaterial.bumpTexture = texture;
                waterMaterial.markAsDirty(Material.AttributesDirtyFlag);
            });

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

        // Adds a mesh instance
        static AddInstancedMesh(core: EditorCore, mesh: Mesh): InstancedMesh {
            var instance = mesh.createInstance("New Instance");
            instance.id = this.GenerateUUID();
            
            this.ConfigureObject(instance, core);

            return instance;
        }
    }
}