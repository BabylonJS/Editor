import {
    Scene,
    PointLight, Mesh, MeshBuilder,
    PBRMaterial, Texture, CubeTexture, StandardMaterial,
    Vector3, Color3,
    ActionManager, StateCondition, SwitchBooleanAction,
    Animation,
    SceneSerializer, FilesInput
} from 'babylonjs';

import Tools from './tools';

export default async function CreateDefaultScene (scene: Scene) {
    scene.imageProcessingConfiguration.contrast = 1.6;
	scene.imageProcessingConfiguration.exposure = 0.6;
	scene.imageProcessingConfiguration.toneMappingEnabled = true;

    // Light
    new PointLight("point", new Vector3(0, 40, 0), scene);

    // Skybox
    const hdrSkybox = Mesh.CreateBox("hdrSkyBox", 1000.0, scene);
    const hdrSkyboxMaterial = new PBRMaterial("skyBox", scene);
    hdrSkyboxMaterial.backFaceCulling = false;
    hdrSkyboxMaterial.microSurface = 1.0;
    hdrSkyboxMaterial.cameraExposure = 0.6;
    hdrSkyboxMaterial.cameraContrast = 1.6;
    hdrSkyboxMaterial.disableLighting = true;
    hdrSkybox.material = hdrSkyboxMaterial;
    hdrSkybox.infiniteDistance = true;

    // Create meshes
    const sphereGlass = Mesh.CreateSphere("sphereGlass", 48, 30.0, scene);
    sphereGlass.translate(new Vector3(1, 0, 0), -60);

    const sphereMetal = Mesh.CreateSphere("sphereMetal", 48, 30.0, scene);
    sphereMetal.translate(new Vector3(1, 0, 0), 60);

    const spherePlastic = Mesh.CreateSphere("spherePlastic", 48, 30.0, scene);
    spherePlastic.translate(new Vector3(0, 0, 1), -60);

    const sphereNull = Mesh.CreateSphere("sphereNull", 48, 30.0, scene);
    sphereNull.material = new StandardMaterial("standardMaterial", scene);
    sphereNull.translate(new Vector3(0, 0, 1), 60);

    const sphereNullInstance =sphereNull.createInstance("instance1");
    sphereNullInstance.translate(new Vector3(0, 0, 1), 120);

    const woodPlank = MeshBuilder.CreateBox("plane", { width: 65, height: 1, depth: 65 }, scene);

    woodPlank.isPickable = true;
    woodPlank.actionManager = new ActionManager(scene);
    const condition = new StateCondition(woodPlank.actionManager, woodPlank, "");
    woodPlank.actionManager.registerAction(
        new SwitchBooleanAction(ActionManager.OnLeftPickTrigger, sphereGlass, "isVisible", null)
    ).then(
        new SwitchBooleanAction(ActionManager.OnLeftPickTrigger, sphereGlass, "isVisible", condition)
    )

    // Create materials
    const glass = new PBRMaterial("glass", scene);
    glass.linkRefractionWithTransparency = true;
    glass.indexOfRefraction = 0.52;
    glass.alpha = 0;
    glass.directIntensity = 0.0;
    glass.environmentIntensity = 0.5;
    glass.cameraExposure = 0.5;
    glass.cameraContrast = 1.7;
    glass.microSurface = 1;
    glass.reflectivityColor = new Color3(0.2, 0.2, 0.2);
    glass.albedoColor = new Color3(0.95, 0.95, 0.95);
    sphereGlass.material = glass;

    const metal = new PBRMaterial("metal", scene);
    metal.directIntensity = 0.3;
    metal.environmentIntensity = 0.7;
    metal.cameraExposure = 0.55;
    metal.cameraContrast = 1.6;
    metal.microSurface = 0.96;
    metal.reflectivityColor = new Color3(0.9, 0.9, 0.9);
    metal.albedoColor = new Color3(1, 1, 1);
    sphereMetal.material = metal;

    const plastic = new PBRMaterial("plastic", scene);
    plastic.directIntensity = 0.6;
    plastic.environmentIntensity = 0.7;
    plastic.cameraExposure = 0.6;
    plastic.cameraContrast = 1.6;
    plastic.microSurface = 0.96;
    plastic.albedoColor = new Color3(0.206, 0.94, 1);
    plastic.reflectivityColor = new Color3(0.05, 0.05, 0.05);
    spherePlastic.material = plastic;

    const wood = new PBRMaterial("wood", scene);
    wood.directIntensity = 1.5;
    wood.environmentIntensity = 0.5;
    wood.specularIntensity = 0.3;
    wood.cameraExposure = 0.9;
    wood.cameraContrast = 1.6;
    wood.useMicroSurfaceFromReflectivityMapAlpha = true;
    wood.albedoColor = Color3.White();
    woodPlank.material = wood;

    await Tools.CreateFileFromURL("assets/textures/environment.dds").then(() => {
        const texture = CubeTexture.CreateFromPrefilteredData("file:environment.dds", scene);
        texture.gammaSpace = false;

        hdrSkyboxMaterial.reflectionTexture = texture.clone();
        hdrSkyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;

        glass.reflectionTexture = texture;
        glass.refractionTexture = texture;
        metal.reflectionTexture = texture;
        plastic.reflectionTexture = texture;
        wood.reflectionTexture = texture;

        texture.name = texture.url = "environment.dds";
        hdrSkyboxMaterial.reflectionTexture.name = hdrSkyboxMaterial.reflectionTexture['url'] = "environment.dds";
    });

    await Tools.CreateFileFromURL("assets/textures/albedo.png").then(() => {
        wood.albedoTexture = new Texture("file:albedo.png", scene);
        wood.albedoTexture.name = wood.albedoTexture['url'] = "albedo.png";
    });

    await Tools.CreateFileFromURL("assets/textures/reflectivity.png").then(() => {
        wood.reflectivityTexture = new Texture("file:reflectivity.png", scene);
        wood.reflectivityTexture.name = wood.reflectivityTexture['url'] = "reflectivity.png";
    });

    var animation = new Animation("fog start", "fogStart", 1, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, true);
    animation.setKeys([
        { frame: 0, value: 0 },
        { frame: 5, value: 5 },
        { frame: 10, value: -5 },
        { frame: 15, value: -0 }
    ]);
    scene.animations.push(animation);

    var animation = new Animation("fog color", "fogColor", 1, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CYCLE, true);
    animation.setKeys([
        { frame: 0, value: new Color3(1, 1, 1) },
        { frame: 5, value: new Color3(0, 1, 0) },
        { frame: 10, value: new Color3(0.25, 0, 0.5) },
        { frame: 15, value: new Color3(1, 1, 1) }
    ]);
    scene.animations.push(animation);

    scene.fogEnabled = true;
    scene.fogMode = Scene.FOGMODE_LINEAR;

    // Create babylon scene
    const serializedScene = SceneSerializer.Serialize(scene);
    const serializedSceneFile = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene.babylon');
    FilesInput.FilesToLoad['scene.babylon'] = serializedSceneFile;
}
