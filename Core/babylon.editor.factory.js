/// <reference path="../index.html" />

/*
Factory that creates nodes for BabylonJS Editor.


*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var Factory = (function () {

    function Factory()
    { }

	Factory.addBox = function (core) {
		var box = BABYLON.Mesh.CreateBox('New Cube', 1, core.currentScene, true);
		box.id = BABYLON.Editor.Utils.GenerateUUID();

		BABYLON.Editor.Utils.SendEventObjectAdded(box, core);
		return box;
	}

	Factory.addSphere = function (core) {
		var sphere = BABYLON.Mesh.CreateSphere('New Sphere', 16, 1, core.currentScene, true);
		sphere.id = BABYLON.Editor.Utils.GenerateUUID();

		BABYLON.Editor.Utils.SendEventObjectAdded(sphere, core);
		return sphere;
	}

	Factory.addGround = function (core) {
		var ground = BABYLON.Mesh.CreateGround("ground1", 6, 6, 2, core.currentScene);
		ground.id = BABYLON.Editor.Utils.GenerateUUID();

		BABYLON.Editor.Utils.SendEventObjectAdded(ground, core);
		return ground;
	}

	Factory.addLight = function (core) {
		var light = new BABYLON.DirectionalLight("globalLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
		light.position = new BABYLON.Vector3(0, 200, 0);
		light.id = BABYLON.Editor.Utils.GenerateUUID();

		BABYLON.Editor.Utils.SendEventObjectAdded(light, core);
		return light;
	}

	return Factory;

})();

BABYLON.Editor.Factory = Factory;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON