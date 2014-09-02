/// <reference path="./../index.html" />

/* File creating common tests */

function createTestScene(scene, core) {

    var light = new BABYLON.DirectionalLight("globalLight", new BABYLON.Vector3(-1, -2, -1), scene);
    light.position = new BABYLON.Vector3(10, 10, 0);

    var shadows = new BABYLON.ShadowGenerator(1024, light);

    var object = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);
    object.isPickable = true;
    object.position.y = 1;
    shadows.getShadowMap().renderList.push(object);
    BabylonEditorUtils.sendEventObjectAdded(object, core);
    light.parent = object;
    BabylonEditorUtils.sendEventObjectAdded(light, core);

    var object2 = BABYLON.Mesh.CreateGround("ground1", 6, 6, 2, scene);
    object2.isPickable = true;
    object2.receiveShadows = true;
    BabylonEditorUtils.sendEventObjectAdded(object2, core);

    var object3 = BABYLON.Mesh.CreateSphere("sphere2", 16, 2, scene);
    object3.isPickable = true;
    object3.position.x = 2;
    object3.position.y = 2;
    object3.parent = object2;
    BabylonEditorUtils.sendEventObjectAdded(object3, core);

}
