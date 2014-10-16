/// <reference path="./../index.html" />

/* File creating common tests */

function createReleaseScene(scene, core) {
    function createMaterial(name, path) {
        var material = new BABYLON.StandardMaterial(name, scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.diffuseTexture = new BABYLON.Texture(path, scene);

        return material;
    }

    /// Light
    var light = new BABYLON.DirectionalLight("globalLight", new BABYLON.Vector3(-1, -2, -1), scene);
    light.position = new BABYLON.Vector3(10, 10, 0);
    var shadows = new BABYLON.ShadowGenerator(1024, light);
    BABYLON.Editor.Utils.SendEventObjectAdded(light, core);

    var object = BABYLON.Mesh.CreateGround("New Ground", 60, 60, 20, scene);
    object.material = createMaterial('ground1m', './Tests/textures/tile.jpg');
    object.material.diffuseTexture.uScale = 15.0;
    object.material.diffuseTexture.vScale = 15.0;
    object.material.reflectionTexture = new BABYLON.MirrorTexture("mirror", 512, scene, true);
    object.material.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, -1.0, 0, 0.0);
    object.material.reflectionTexture.level = 0.6;
    object.id = BABYLON.Editor.Utils.GenerateUUID();
    object.isPickable = true;
    object.receiveShadows = true;
    BABYLON.Editor.Utils.SendEventObjectAdded(object, core);

    var box = BABYLON.Mesh.CreateBox('New Cube', 1, core.currentScene, true);
    //box.material = createMaterial('sphere1m', './Tests/textures/diffuse.tga');
    box.scaling = new BABYLON.Vector3(4, 4, 4);
    box.position = new BABYLON.Vector3(0, 2, 0);
    box.id = BABYLON.Editor.Utils.GenerateUUID();
    shadows.getShadowMap().renderList.push(box);
    BABYLON.Editor.Utils.SendEventObjectAdded(box, core);

    object.material.reflectionTexture.renderList = [box];
}

function createTestScene(scene, core) {

    function createMaterial(name, path) {
        var material = new BABYLON.StandardMaterial(name, scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.diffuseTexture = new BABYLON.Texture(path, scene);

        return material;
    }

    var light = new BABYLON.DirectionalLight("globalLight", new BABYLON.Vector3(-1, -2, -1), scene);
    light.position = new BABYLON.Vector3(10, 10, 0);

    var shadows = new BABYLON.ShadowGenerator(1024, light);

    var object = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);
    object.material = createMaterial('sphere1m', './Tests/textures/diffuse.tga');
    object.isPickable = true;
    object.position.y = 1;
    shadows.getShadowMap().renderList.push(object);
    BABYLON.Editor.Utils.SendEventObjectAdded(object, core);
    light.parent = object;
    BABYLON.Editor.Utils.SendEventObjectAdded(light, core);

    var object2 = BABYLON.Mesh.CreateGround("ground1", 6, 6, 2, scene);
    object2.material = createMaterial('ground1m', './Tests/textures/tile.jpg');
    object2.isPickable = true;
    object2.receiveShadows = true;
    BABYLON.Editor.Utils.SendEventObjectAdded(object2, core);

    var object3 = BABYLON.Mesh.CreateSphere("sphere2", 16, 2, scene);
    object3.material = createMaterial('sphere2m', './Tests/textures/diffuse.tga');
    object3.material.bumpTexture = new BABYLON.Texture('./Tests/textures/normal.tga', scene);
    object3.isPickable = true;
    object3.position.x = 2;
    object3.position.y = 2;
    object3.parent = object2;
    shadows.getShadowMap().renderList.push(object3);
    BABYLON.Editor.Utils.SendEventObjectAdded(object3, core);

}

function runPlugin(core) {
    var plugin = createPlugin({});
    plugin.configure(core);
    //delete createPlugin;
}
