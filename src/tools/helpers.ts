import { Engine, Scene, ArcRotateCamera, Vector3 } from 'babylonjs';
import { Editor, CodeEditor } from 'babylonjs-editor';

import Extensions from '../extensions/extensions';

import CodeExtension, { BehaviorCode } from '../extensions/behavior/code';
import { GraphData } from '../extensions/behavior/graph';

export interface SceneMetadata {
    behaviorScripts?: BehaviorCode[];
    behaviorGraphs?: GraphData[];
    [index: string]: any;
}

export interface Preview {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
}

export default class Helpers {
    /**
     * Updates the typings for monaco basing on custom behavior scripts (not attached scripts)
     * @param editor the editor reference
     * @param editedData the data being updated to avoid typings duplication
     */
    public static UpdateMonacoTypings (editor: Editor, editedData: any = null, onlyNonAttached: boolean = false): void {
        // Manage extra libs
        const scripts = editor.core.scene.metadata.behaviorScripts;
        const extension = <CodeExtension> Extensions.RequestExtension(editor.core.scene, 'BehaviorExtension');

        if (scripts && extension) {
            const datas = extension.onSerialize();

            // Remove libraries
            for (const k in CodeEditor.CustomLibs) {
                const lib = CodeEditor.CustomLibs[k];
                lib.dispose();
            }

            CodeEditor.CustomLibs = { };
        
            // Add libraries
            scripts.forEach(s => {
                if (s === editedData)
                    return;

                if (onlyNonAttached) {
                    // Check if attached, then don't share declaration
                    const isAttached = datas.nodes.find(n => n.metadatas.find(m => m.codeId === s.id) !== undefined);

                    if (isAttached)
                        return;
                }

                const code = `declare module "${s.name}" {${s.code}}`;
                CodeEditor.CustomLibs[s.name] = window['monaco'].languages.typescript.typescriptDefaults.addExtraLib(code, s.name);
            });
        }
    }

    /**
     * Returns the scene's metadatas. If empty, default object is created
     * @param scene the scene to retrieve its metadatas
     */
    public static GetSceneMetadatas (scene: Scene): SceneMetadata {
        scene.metadata = scene.metadata || { };
        return scene.metadata;
    }

    /**
     * Creates a new preview object by creating a new engine, scene and camera
     * @param canvas the canvas where to render the created scene
     */
    public static CreatePreview (canvas: HTMLCanvasElement): Preview {
        const engine = new Engine(canvas);
        const scene = new Scene(engine);

        const camera = new ArcRotateCamera('PreviewCamera', 0, 0, 10, Vector3.Zero(), scene, true);
        camera.attachControl(canvas, true, false);

        return {
            engine: engine,
            scene: scene,
            camera: camera
        };
    }
}
