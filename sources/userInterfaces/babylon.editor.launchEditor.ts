module BABYLON.EDITOR {
    interface IObjectPickerRow extends GUI.IGridRowData {
        name: string;
    }

    export class LaunchEditor {
        // Public members
        public core: EditorCore;

        // Private members

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;

            var picker = new ObjectPicker(core);
            picker.objectLists.push([core.currentScene]);
            picker.objectLists.push(core.currentScene.lights);
            picker.objectLists.push(core.currentScene.cameras);
            picker.objectLists.push(core.currentScene.meshes);

            picker.selectedObjects = SceneFactory.NodesToStart;

            picker.open();

            picker.onObjectPicked = (names: string[]) => {
                SceneFactory.NodesToStart = [];

                for (var i = 0; i < names.length; i++) {
                    var node: any = core.currentScene.getNodeByName(names[i]);

                    if (!node && names[i] === "Scene")
                        node = core.currentScene;

                    if (!node)
                        continue;

                    SceneFactory.NodesToStart.push(node);
                }
            };
        }
    }
}
