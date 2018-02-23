import { Scene, Mesh } from 'babylonjs';
import { GLTF2Export, OBJExport } from 'babylonjs-serializers';

import Window from '../gui/window';
import List from '../gui/list';

export default class SceneSerializer {
    /**
     * Constructor
     * @param scene: the scene to serializer
     */
    constructor (scene: Scene) {
        // Create window
        const window = new Window('Scene Serializer');
        window.buttons = ['Ok', 'Cancel'];
        window.width = 400;
        window.height = 125;
        window.body = `
            <div id="SCENE-SERIALIZER-WINDOW" style="width: 100%; height: 100%;">
                <label>Format: </label><div id="SERIALIZER-FORMAT-LIST"></div>
                <label>Name: </label><input type="text" />
            </div>
        `;
        window.open();

        // Create dialog
        const list = new List('Format List');
        list.build($('#SERIALIZER-FORMAT-LIST')[0]);
        list.setItems(['GLTF', 'GLB', 'OBJ']);

        // Events
        window.onButtonClick = (id) => {
            if (id === 'Cancel')
                return window.close();

            debugger;
            const selected = list.getSelected();

            switch (selected) {
                case 'GLB': GLTF2Export.GLB(scene, 'scene', { }).downloadFiles(); break;
                case 'GLTF': GLTF2Export.GLTF(scene, 'scene', { }).downloadFiles(); break;
                case 'OBJ':
                    const obj = OBJExport.OBJ(<Mesh[]> scene.meshes, true);
                    debugger;
                    break;
                default: return;
            }

            window.close();
        };
    }
}
