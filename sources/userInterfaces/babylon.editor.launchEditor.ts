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
            picker.objectLists.push(core.currentScene.particleSystems);
            picker.objectLists.push(core.currentScene.soundTracks[0].soundCollection);

            picker.selectedObjects = SceneFactory.NodesToStart;
            picker.minSelectCount = 0;

            picker.open();

            picker.onObjectPicked = (names: string[]) => {
                SceneFactory.NodesToStart = [];

                for (var i = 0; i < names.length; i++) {
                    var node: IAnimatable = core.currentScene.getNodeByName(names[i]);

                    if (!node && names[i] === "Scene")
                        node = core.currentScene;

                    // Particle system
                    if (!node) {
                        //node = core.currentScene.getParticleSystemByName(names[i]);
                        node = Tools.GetParticleSystemByName(core.currentScene, names[i]);
                    }

                    if (!node) {
                        // Sound ?
                        node = <any>core.currentScene.getSoundByName(names[i]);

                        if (!node)
                            continue;
                    }

                    SceneFactory.NodesToStart.push(node);
                }

                core.editor.timeline.reset();
            };
        }
    }
}
