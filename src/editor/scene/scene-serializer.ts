import { Scene, Mesh } from 'babylonjs';
import { GLTF2Export, OBJExport } from 'babylonjs-serializers';

import Window from '../gui/window';
import Form from '../gui/form';

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
        window.height = 165;
        window.body = `<div id="SCENE-SERIALIZER-WINDOW" style="width: 100%; height: 100%"></div>`;
        window.open();

        // Form
        const form = new Form('SceneSerializer');
        form.fields = [
            { name: 'name', type: 'text', required: true },
            { name: 'format', type: 'list', required: true, options: { items: ['GLB', 'GLTF', 'OBJ'] } }
        ];
        form.build('SCENE-SERIALIZER-WINDOW');

        // Set default values
        form.element.record['name'] = 'scene';
        form.element.record['format'] = 'GLB';
        form.element.refresh();

        // Events
        window.onButtonClick = async (id) => {
            window.close();

            if (id === 'Cancel')
                return form.element.destroy();

            if (!form.isValid())
                return;
            
            const name = form.element.record['name'];
            const format = form.element.record['format'].id;

            try {
                switch (format) {
                    case 'GLB': (await GLTF2Export.GLBAsync(scene, name, { })).downloadFiles(); break;
                    case 'GLTF': (await GLTF2Export.GLTFAsync(scene, name, { })).downloadFiles(); break;
                    case 'OBJ':
                        const obj = OBJExport.OBJ(<Mesh[]> scene.meshes, true);
                        debugger;
                        break;
                    default: return;
                }
            } catch (e) {
                Window.CreateAlert(e.message, 'Error when exporting the scene');
            }

            // Clear
            form.element.destroy();
        };
    }
}
