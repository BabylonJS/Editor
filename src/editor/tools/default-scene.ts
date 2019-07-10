import {
    Mesh, FilesInputStore, ActionManager, ExecuteCodeAction, PBRMaterial
} from 'babylonjs';

import {
    AdvancedDynamicTexture,
    Rectangle, Line, TextBlock,
    Control
} from 'babylonjs-gui';

import Editor from '../editor';
import Tools from './tools';

import SceneExporter from '../scene/scene-exporter';
import SceneImporter from '../scene/scene-importer';

import ProjectExporter from '../project/project-exporter';

export default class DefaultScene {
    /**
     * Creates a new label
     * @param gui: the gui texture
     * @param mesh: the mesh to attach
     * @param str: the string to draw
     * @param lines: if draw lines
     */
    public static CreateLabel (gui: AdvancedDynamicTexture, mesh: Mesh, str: string, lines: boolean, width: string, height: string): Rectangle {
        // PBR GUI
        const label = new Rectangle(str);
        label.background = 'black'
        label.height = height;
        label.alpha = 0.5;
        label.width = width;
        label.cornerRadius = 20;
        label.thickness = 1;
        label.linkOffsetY = 30;
        label.top = '0%';
        label.zIndex = 5;
        label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        gui.addControl(label);

        const text = new TextBlock();
        text.text = str;
        text.color = 'white';
        label.addControl(text);
    
        if (!lines) {
            label.linkWithMesh(mesh);
            return label;
        }

        var line = new Line();
        line.alpha = 0.5;
        line.lineWidth = 5;
        line.dash = [5, 10];
        gui.addControl(line);
        line.linkWithMesh(mesh);
        line.connectedControl = label;

        return label;
    }

    /**
     * Creates the default scene
     * @param scene: the editor reference
     */
    public static async Create (editor: Editor): Promise<void> {
        // Clear previous files
        editor.sceneFile && delete FilesInputStore.FilesToLoad[editor.sceneFile.name.toLowerCase()];
        editor.projectFile && delete FilesInputStore.FilesToLoad[editor.projectFile.name.toLowerCase()];

        // Project
        const project = JSON.parse(await Tools.LoadFile<string>('assets/defaultScene/scene.editorproject'));
        await SceneImporter.LoadProjectFromFile(editor, 'assets/defaultScene/scene.editorproject', project, false);
        ProjectExporter.ProjectPath = null;

        // Scene file
        SceneExporter.CreateFiles(editor);

        // Event
        editor.core.onSceneLoaded.addOnce(d => {
            // GUI
            const gui = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, editor.core.scene);
            gui.layer.layerMask = 2;
            editor.core.uiTextures.push(gui);

            this.CreateLabel(gui, <Mesh> d.scene.getMeshByName('Sphere Animated'), 'Animated\nView => Animations...', false, '200px', '60px');
            this.CreateLabel(gui, <Mesh> d.scene.getMeshByName('Sphere Standard'), 'Standard Material', false, '200px', '30px');
            this.CreateLabel(gui, <Mesh> d.scene.getMeshByName('Sphere PBR'), 'PBR Material', false, '150px', '30px');
            this.CreateLabel(gui, <Mesh> d.scene.getMeshByName('Documentation'), 'Documentation (Double Click)', false, '300px', '30px');
            this.CreateLabel(gui, <Mesh> d.scene.getMeshByName('Rain Particles'), 'Rain Particle System', false, '300px', '30px');
            this.CreateLabel(gui, <Mesh> d.scene.getMeshByName('Drop Particles'), 'Drop Particle System', false, '300px', '30px');

            // Actions
            const documentation = d.scene.getMeshByName('Documentation')
            documentation.actionManager = new ActionManager(d.scene);
            documentation.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnDoublePickTrigger, (evt) => {
                window.open('http://doc.babylonjs.com/resources');
            }));
        });
    }

    /**
     * Creates an empty scene/project
     * @param editor the editor reference
     */
    public static async CreateEmpty (editor: Editor): Promise<void> {
        // Clear previous files
        editor.sceneFile && delete FilesInputStore.FilesToLoad[editor.sceneFile.name.toLowerCase()];
        editor.projectFile && delete FilesInputStore.FilesToLoad[editor.projectFile.name.toLowerCase()];

        // Clear files
        FilesInputStore.FilesToLoad = { };

        // Project
        const project = JSON.parse(await Tools.LoadFile<string>('assets/emptyScene/scene.editorproject'));
        await SceneImporter.LoadProjectFromFile(editor, 'assets/emptyScene/scene.editorproject', project, false);
        ProjectExporter.ProjectPath = null;

        // Scene file
        SceneExporter.CreateFiles(editor);
    }
}
