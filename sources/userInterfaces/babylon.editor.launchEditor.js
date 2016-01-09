var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LaunchEditor = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core
            */
            function LaunchEditor(core) {
                // Initialize
                this.core = core;
                var picker = new EDITOR.ObjectPicker(core);
                picker.objectLists.push([core.currentScene]);
                picker.objectLists.push(core.currentScene.lights);
                picker.objectLists.push(core.currentScene.cameras);
                picker.objectLists.push(core.currentScene.meshes);
                picker.selectedObjects = EDITOR.SceneFactory.NodesToStart;
                picker.open();
                picker.onObjectPicked = function (names) {
                    EDITOR.SceneFactory.NodesToStart = [];
                    for (var i = 0; i < names.length; i++) {
                        var node = core.currentScene.getNodeByName(names[i]);
                        if (!node && names[i] === "Scene")
                            node = core.currentScene;
                        if (!node)
                            continue;
                        EDITOR.SceneFactory.NodesToStart.push(node);
                    }
                };
            }
            return LaunchEditor;
        })();
        EDITOR.LaunchEditor = LaunchEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.launchEditor.js.map