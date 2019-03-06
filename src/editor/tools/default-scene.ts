import {
    Scene, Mesh,
    PBRMaterial, Texture, CubeTexture, StandardMaterial,
    Vector3, ActionManager, Animation,
    SceneSerializer, SpotLight, ShadowGenerator,
    ExecuteCodeAction, Color4,
    Tags, FilesInputStore,
    Tools as BabylonTools
} from 'babylonjs';

import {
    AdvancedDynamicTexture,
    Rectangle, Line, TextBlock,
    Control
} from 'babylonjs-gui';

import Editor from '../editor';
import SceneFactory from '../scene/scene-factory';
import SceneExporter from '../scene/scene-exporter';

import Tools from './tools';

export default class DefaultScene {
    /**
     * Creates a texture file and returns the given texture
     * @param url: the url of the texture
     * @param scene: the scene where to add the texture
     */
    public static async LoadTexture (url: string, scene: Scene): Promise<Texture> {
        await Tools.CreateFileFromURL(url);

        const name = Tools.GetFilename(url);

        const texture = new Texture('file:' + name, scene);
        texture.name = texture['url'] = name;

        return texture;
    }

    /**
     * Creates a new label
     * @param gui: the gui texture
     * @param mesh: the mesh to attach
     * @param str: the string to draw
     * @param lines: if draw lines
     */
    public static CreateLabel (gui: AdvancedDynamicTexture, mesh: Mesh, str: string, lines: boolean, width: string, height: string): Rectangle {
        // PBR GUI
        const label = new Rectangle(str);
        label.background = 'black'
        label.height = height;
        label.alpha = 0.5;
        label.width = width;
        label.cornerRadius = 20;
        label.thickness = 1;
        label.linkOffsetY = 30;
        label.top = '0%';
        label.zIndex = 5;
        label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        gui.addControl(label);

        const text = new TextBlock();
        text.text = str;
        text.color = 'white';
        label.addControl(text);
    
        if (!lines) {
            label.linkWithMesh(mesh);
            return label;
        }

        var line = new Line();
        line.alpha = 0.5;
        line.lineWidth = 5;
        line.dash = [5, 10];
        gui.addControl(line);
        line.linkWithMesh(mesh);
        line.connectedControl = label;

        return label;
    }

    /**
     * Creates the default scene
     * @param scene: the scene reference where to create objects
     */
    public static async Create (editor: Editor): Promise<void> {
        // Misc.
        const scene = editor.core.scene;
        scene.clearColor = new Color4(0, 0, 0, 1);

        // Image processing
        scene.imageProcessingConfiguration.contrast = 1;
        scene.imageProcessingConfiguration.exposure = 1;
        scene.imageProcessingConfiguration.toneMappingEnabled = true;

        // HDR
        let hdrTexture: CubeTexture = null;

        // Skybox
        const skyboxMaterial = new PBRMaterial('SkyboxMaterial', scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.microSurface = 0.85;
        skyboxMaterial.cameraExposure = 0.6;
        skyboxMaterial.cameraContrast = 1.6;
        skyboxMaterial.disableLighting = true;

        await Tools.CreateFileFromURL("assets/textures/environment.dds").then(() => {
            hdrTexture = CubeTexture.CreateFromPrefilteredData("file:environment.dds", scene);
            hdrTexture.gammaSpace = false;
            
            skyboxMaterial.reflectionTexture = hdrTexture.clone();
            skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    
            hdrTexture.name = hdrTexture.url = "environment.dds";
            skyboxMaterial.reflectionTexture['url'] = "environment.dds";
            skyboxMaterial.reflectionTexture.name = "environment.dds";
        });

        const skybox = Mesh.CreateBox("hdrSkyBox", 1000, scene);
        skybox.id = BabylonTools.RandomId();
        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;

        // Plane
        let floor: Texture = null;
        let floorBump: Texture = null;
        let floorAmbient: Texture = null;

        await Promise.all([
            this.LoadTexture('assets/textures/mahogfloor_basecolor.png', scene).then(t => { t.uScale = t.vScale = 45; floor = t }),
            this.LoadTexture('assets/textures/mahogfloor_normal.jpg', scene).then(t => { t.uScale = t.vScale = 45; floorBump = t }),
            this.LoadTexture('assets/textures/mahogfloor_AO.jpg', scene).then(t => { t.uScale = t.vScale = 45; floorAmbient = t })
        ]);

        //const floorReflectivity = await this.LoadTexture('assets/textures/mahogfloor_roughness.jpg', scene);
        //floorReflectivity.uScale = floorReflectivity.vScale = 45;

        const groundMaterial = new PBRMaterial('GroundMaterial', scene);
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

        const ground = Mesh.CreateGround('Ground', 512, 512, 32, scene);
        ground.id = BabylonTools.RandomId();
        ground.receiveShadows = true;
        ground.material = groundMaterial;

        // Sphere PBR
        let metal: Texture = null;
        let metalBump: Texture = null;
        let metalReflectivity: Texture = null;
        let metalMetallic: Texture = null;

        await Promise.all([
            this.LoadTexture('assets/textures/rustediron2_basecolor.png', scene).then(t => metal = t),
            this.LoadTexture('assets/textures/rustediron2_normal.png', scene).then(t => metalBump = t),
            this.LoadTexture('assets/textures/rustediron2_roughness.png', scene).then(t => metalReflectivity = t),
            this.LoadTexture('assets/textures/rustediron2_metallic.png', scene).then(t => metalMetallic = t)
        ]);

        const sphereMaterialPBR = new PBRMaterial('SpherePBR', scene);
        sphereMaterialPBR.albedoTexture = metal;
        sphereMaterialPBR.bumpTexture = metalBump;
        sphereMaterialPBR.reflectivityTexture = metalReflectivity;
        sphereMaterialPBR.ambientTexture = metalMetallic;
        sphereMaterialPBR.reflectionTexture = hdrTexture;

        const spherePBR = Mesh.CreateSphere('Sphere PBR', 32, 5, scene);
        spherePBR.id = BabylonTools.RandomId();
        spherePBR.position.set(-5, 3, 0);
        spherePBR.material = sphereMaterialPBR;

        // Sphere Standard
        let wood: Texture = null;
        let woodReflectivity: Texture = null;

        await Promise.all([
            this.LoadTexture('assets/textures/albedo.png', scene).then(t => wood = t),
            this.LoadTexture('assets/textures/reflectivity.png', scene).then(t => woodReflectivity = t)
        ]);

        const sphereMaterialStd = new StandardMaterial('SphereStandard', scene);
        sphereMaterialStd.diffuseTexture = wood;
        sphereMaterialStd.specularTexture = woodReflectivity;

        const sphereStd = Mesh.CreateSphere('Sphere Standard', 32, 5, scene);
        sphereStd.id = BabylonTools.RandomId();
        sphereStd.position.set(5, 3, 0);
        sphereStd.material = sphereMaterialStd;

        // Sphere Animated
        const amiga = await this.LoadTexture('assets/textures/amiga.jpg', scene);

        const sphereMaterialAnim = new StandardMaterial('SphereAnimated', scene);
        sphereMaterialAnim.emissiveTexture = amiga;

        const sphereAnimated = Mesh.CreateSphere('Sphere Animated', 32, 5, scene);
        sphereAnimated.id = BabylonTools.RandomId();
        sphereAnimated.position.set(15, 3, 0);
        sphereAnimated.material = sphereMaterialAnim;

        let anim = new Animation('Rotation', 'rotation.y', 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, true);
        anim.setKeys([
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI },
            { frame: 120, value: 0 },
            { frame: 180, value: -Math.PI },
            { frame: 240, value: 0 }
        ]);

        sphereAnimated.animations.push(anim);

        anim = new Animation('Position', 'position', 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE, true);
        anim.setKeys([
            { frame: 0, value: new Vector3(0, 0, 0) },
            { frame: 60, value: new Vector3(0, 5, 0) },
            { frame: 120, value: new Vector3(5, 5, 0) },
            { frame: 180, value: new Vector3(0, 5, 5) },
            { frame: 240, value: new Vector3(0, 0, 0) }
        ]);

        sphereAnimated.animations.push(anim);
        //scene.beginAnimation(sphereAnimated, 0, 240, true, 1.0);

        // Plane
        const documentation = await this.LoadTexture('assets/textures/documentation.png', scene);

        const planeMaterial = new StandardMaterial('PlaneMaterial', scene);
        planeMaterial.emissiveTexture = documentation;

        const plane = Mesh.CreatePlane('Documentation Plane', 100, scene);
        plane.id = BabylonTools.RandomId();
        plane.rotation.y = Math.PI;
        plane.position.set(0, 55, -135);
        plane.scaling.set((1280 / 800), 1, 1);
        plane.material = planeMaterial;

        plane.actionManager = new ActionManager(scene);
        plane.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, (evt) => {
            window.open('http://doc.babylonjs.com/resources');
        }));

        // Rain
        const rainEmitter = new Mesh('Rain Particle System Emitter', scene);
        rainEmitter.id = BabylonTools.RandomId();
        rainEmitter.position.y = 25;
        Tags.AddTagsTo(rainEmitter, 'added_particlesystem');

        const rain = SceneFactory.CreateDefaultParticleSystem(editor, false, rainEmitter);
        rain.id = BabylonTools.RandomId();
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
        rain.particleTexture = await this.LoadTexture('assets/textures/rain.jpg', scene);

        // Drop
        const dropEmitter = new Mesh('Drop Particle System Emitter', scene);
        dropEmitter.id = BabylonTools.RandomId();
        dropEmitter.position.y = 1;
        Tags.AddTagsTo(dropEmitter, 'added_particlesystem');

        const drop = SceneFactory.CreateDefaultParticleSystem(editor, true, dropEmitter);
        drop.id = BabylonTools.RandomId();
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
        drop.particleTexture = await this.LoadTexture('assets/textures/flake.bmp', scene);

        // Light
        const spot = new SpotLight('Spot Light', new Vector3(20, 20, 20), new Vector3(-1, -2, 0), 2.4, 2.4, scene);
        spot.id = BabylonTools.RandomId();

        const shadows = new ShadowGenerator(2048, spot, true);
        shadows.usePoissonSampling = true;
        shadows.getShadowMap().renderList = [spherePBR, sphereStd];

        // GUI
        const gui = AdvancedDynamicTexture.CreateFullscreenUI('ui');
        gui.layer.layerMask = 2;
        editor.core.uiTextures.push(gui);

        // Labels
        this.CreateLabel(gui, sphereAnimated, 'Animated\nView => Animations...', false, '200px', '60px');
        this.CreateLabel(gui, sphereStd, 'Standard Material', false, '200px', '30px');
        this.CreateLabel(gui, spherePBR, 'PBR Material', false, '150px', '30px');
        this.CreateLabel(gui, plane, 'Documentation (Double Click)', false, '300px', '30px');
        this.CreateLabel(gui, rainEmitter, 'Rain Particle System', false, '300px', '30px');
        this.CreateLabel(gui, dropEmitter, 'Drop Particle System', false, '300px', '30px');

        // Scene file
        const serializedScene = SceneSerializer.Serialize(scene);
        const serializedSceneFile = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene.babylon');
        FilesInputStore.FilesToLoad['scene.babylon'] = serializedSceneFile;

        SceneExporter.CreateFiles(editor);

        // Pickable
        scene.meshes.forEach(m => m.isPickable = true);
    }
}
