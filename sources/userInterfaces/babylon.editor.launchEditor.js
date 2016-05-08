var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LaunchEditor = (function () {
            function LaunchEditor(core) {
                this.core = core;
                var picker = new EDITOR.ObjectPicker(core);
                picker.objectLists.push([core.currentScene]);
                picker.objectLists.push(core.currentScene.lights);
                picker.objectLists.push(core.currentScene.cameras);
                picker.objectLists.push(core.currentScene.meshes);
                picker.objectLists.push(core.currentScene.particleSystems);
                picker.objectLists.push(core.currentScene.soundTracks[0].soundCollection);
                picker.selectedObjects = EDITOR.SceneFactory.NodesToStart;
                picker.minSelectCount = 0;
                picker.open();
                picker.onObjectPicked = function (names) {
                    EDITOR.SceneFactory.NodesToStart = [];
                    for (var i = 0; i < names.length; i++) {
                        var node = core.currentScene.getNodeByName(names[i]);
                        if (!node && names[i] === "Scene")
                            node = core.currentScene;
                        if (!node) {
                            node = EDITOR.Tools.GetParticleSystemByName(core.currentScene, names[i]);
                        }
                        if (!node) {
                            node = core.currentScene.getSoundByName(names[i]);
                            if (!node)
                                continue;
                        }
                        EDITOR.SceneFactory.NodesToStart.push(node);
                    }
                    core.editor.timeline.reset();
                };
            }
            return LaunchEditor;
        }());
        EDITOR.LaunchEditor = LaunchEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
