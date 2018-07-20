import {
    FilesInput, Tools as BabylonTools,
    SceneSerializer,
    Node, AbstractMesh, Light, Camera,
    Tags,
    Vector3,
    ActionManager,
    ParticleSystem
} from 'babylonjs';
import { GLTF2Export, GLTFData } from 'babylonjs-serializers';

import SceneManager from './scene-manager';

import Window from '../gui/window';
import Form from '../gui/form';

import Tools from '../tools/tools';
import Editor from '../editor';
import Extensions from '../../extensions/extensions';

import Storage, { CreateFiles } from '../storage/storage';

import * as Export from '../typings/project';
import { IStringDictionary } from '../typings/typings';

const randomId = BabylonTools.RandomId();

export default class SceneExporter {
    // Public members
    public static ProjectPath: string = null;
    public static ProjectExportFormat: 'babylon' | 'glb' | 'gltf' = 'babylon';

    /**
     * Creates a new file
     * @param editor: the editor instance
     */
    public static CreateFiles (editor: Editor, format: 'babylon' | 'glb' | 'gltf' = 'babylon'): void {
        // Scene
        const serializedScene = SceneSerializer.Serialize(editor.core.scene);
        if (editor.playCamera)
            serializedScene.activeCameraID = editor.playCamera.id;

        let file: File = null;
        
        if (format === 'babylon') {
            file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene.babylon');
            editor.sceneFile = file;
        }

        // Gui
        editor.guiFiles = [];
        editor.core.uiTextures.forEach(ut => {
            const serializedGui = ut.serialize();
            editor.guiFiles.push(Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedGui)), ut.name + '.gui'));
        });

        // Project
        const name = 'scene' + randomId + '.editorproject';
        const project = this.Export(editor);
        file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(project)), name);
        editor.projectFile = file;
    }

    /**
     * Creates the babylon scene and a download link for the babylon file
     * @param editor the editor reference
     */
    public static DownloadBabylonFile (editor: Editor): void {
        this.CreateFiles(editor);
        BabylonTools.Download(editor.sceneFile, editor.sceneFile.name);
    }

    /**
     * Uploads all scene templates
     * @param editor the editor reference
     */
    public static async ExportTemplate (editor: Editor): Promise<void> {
        // Create format window
        const window = new Window('ExportTemplate');
        window.buttons = ['Ok'];
        window.width = 400;
        window.height = 125;
        window.body = `<div id="EXPORT-TEMPLATE-FORMAT" style="width: 100%; height: 100%;"></div>`;
        window.open();

        // Create form
        const form = new Form('SceneFormatForm');
        form.fields = [{ name: 'format', type: 'list', required: true, options: { items: ['babylon', 'glb', 'gltf'] } }];
        form.build('EXPORT-TEMPLATE-FORMAT');

        form.element.record['format'] = this.ProjectExportFormat;
        form.element.refresh();

        // Events
        window.onButtonClick = async () => {
            // Update scene format
            this.ProjectExportFormat = form.element.record['format'].id;

            // Clear
            form.element.destroy();
            window.close();

            // Create scene files
            this.CreateFiles(editor, this.ProjectExportFormat);

            // Create files to upload
            const sceneFiles: CreateFiles[] = [{ name: 'project.editorproject', data: JSON.stringify(this.Export(editor).customMetadatas) }];

            if (this.ProjectExportFormat === 'babylon') {
                sceneFiles.push({ name: 'scene.babylon', data: await Tools.ReadFileAsArrayBuffer(editor.sceneFile) });
            }
            else {
                let data: GLTFData = null;

                try {
                    switch (this.ProjectExportFormat) {
                        case 'glb': data = await GLTF2Export.GLBAsync(editor.core.scene, 'scene', { }); break;
                        case 'gltf': data = await GLTF2Export.GLTFAsync(editor.core.scene, 'scene', { }); break;
                        default: break;
                    }
                } catch (e) {
                    Window.CreateAlert(e.message, 'Error when exporting the scene');
                    return;
                }

                for (const f in data.glTFFiles) {
                    const file = data.glTFFiles[f];
                    sceneFiles.push({ name: f, data: await Tools.ReadFileAsArrayBuffer(<File> file) });
                }
            }

            Object.keys(FilesInput.FilesToLoad).forEach(async k => sceneFiles.push({ name: k, data: await Tools.ReadFileAsArrayBuffer(FilesInput.FilesToLoad[k]) }));

            // Src files
            const srcFiles: CreateFiles[] = [
                { name: 'game.ts', data: (await Tools.LoadFile<string>('assets/templates/template/src/game.ts')).replace('{{scene_format}}', this.ProjectExportFormat) }
            ];

            const distFiles: CreateFiles[] = [ // To be removed in future in order to use babylonjs-editor module
                { name: 'editor.extensions.js', data: await Tools.LoadFile<string>('dist/editor.extensions.js') },
                { name: 'babylonjs-editor-extensions.d.ts', data: await Tools.LoadFile<string>('babylonjs-editor-extensions.d.ts') }
            ];

            const storage = await this.GetStorage(editor);
            storage.openPicker('Create Template...', [
                { name: 'scene', folder: sceneFiles },
                { name: 'src', folder: srcFiles },
                { name: 'libs', folder: distFiles },
                { name: 'README.md', data: await Tools.LoadFile<string>('assets/templates/template/README.md') },
                { name: 'index.html', data: await Tools.LoadFile<string>('assets/templates/template/index.html') },
                { name: 'package.json', data: await Tools.LoadFile<string>('assets/templates/template/package.json') },
                { name: 'tsconfig.json', data: await Tools.LoadFile<string>('assets/templates/template/tsconfig.json') }
            ]);
        };
    }

    /**
     * Exports the editor project into the storage
     * @param editor the editor reference
     */
    public static async ExportProject (editor: Editor): Promise<void> {
        // Project
        const content = JSON.stringify(this.Export(editor));
        const storage = await this.GetStorage(editor);
        const files: CreateFiles[] = [{ name: 'scene.editorproject', data: content }];

        storage.onCreateFiles = folder => this.ProjectPath = folder;
        storage.openPicker('Export Editor Project...', files, this.ProjectPath);
    }

    /**
     * Downloads the project's file
     * @param editor the editor reference
     */
    public static async DownloadProjectFile (editor: Editor): Promise<void> {
        // Project
        const content = JSON.stringify(this.Export(editor));
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(content), 'scene.editorproject');

        BabylonTools.Download(file, file.name);
    }

    /**
     * Returns the appropriate storage (OneDrive, Electron, etc.)
     * @param editor the editor reference
     */
    public static async GetStorage (editor: Editor): Promise<Storage> {
        const storage = Tools.IsElectron()
            ? await Tools.ImportScript<any>('build/src/editor/storage/electron-storage.js')
            : await Tools.ImportScript<any>('build/src/editor/storage/one-drive-storage.js');

        return new storage.default(editor);
    }

    /**
     * Exports the current editor project
     */
    public static Export (editor: Editor): Export.ProjectRoot {
        // Toggle scene manager
        SceneManager.Toggle(editor.core.scene);

        const project: Export.ProjectRoot = {
            actions: null,
            customMetadatas: this._SerializeCustomMetadatas(editor),
            globalConfiguration: null,
            lensFlares: null,
            materials: this._SerializeMaterials(editor),
            nodes: this._SerializeNodes(editor),
            particleSystems: this._SerializeParticleSystems(editor),
            physicsEnabled: editor.core.scene.isPhysicsEnabled(),
            renderTargets: this._SerializeRenderTargets(editor),
            requestedMaterials: null,
            shadowGenerators: this._SerializeShadowGenerators(editor),
            sounds: this._SerializeSounds(editor),
            gui: editor.core.uiTextures.map(ut => ut.serialize()),
            effectLayers: this._SerializeEffectLayers(editor)
        };

        // Finish
        SceneManager.Toggle(editor.core.scene);

        return project;
    }

    /**
     * Serializes the custom sounds
     */
    private static _SerializeSounds (editor: Editor): Export.Sound[] {
        const result: Export.Sound[] = [];
        const scene = editor.core.scene;

        scene.soundTracks.forEach(st => {
            st.soundCollection.forEach(s => {
                if (!Tags.HasTags(s) || !Tags.MatchesQuery(s, 'added'))
                    return;

                result.push({
                    name: s.name,
                    serializationObject: s.serialize()
                });
            });
        });

        return result;
    }

    /**
     * Serializes the custom metadatas
     */
    private static _SerializeCustomMetadatas (editor: Editor): IStringDictionary<any> {
        const result = { };

        // Instances have been
        for (const e in Extensions.Instances)
            result[e] = Extensions.Instances[e].onSerialize();

        return result;
    }

    /**
     * Serializes the shadow generators
     */
    private static _SerializeShadowGenerators (editor: Editor): any[] {
        const result = [];

        editor.core.scene.lights.forEach(l => {
            const sg = l.getShadowGenerator();
            if (!sg || !Tags.HasTags(sg) || !Tags.MatchesQuery(sg, 'added'))
                return;

            result.push(sg.serialize());
        });

        return result;
    }

    /**
     * Serializes all the render targets
     */
    private static _SerializeRenderTargets (editor: Editor): Export.RenderTarget[] {
        const renderTargets: Export.RenderTarget[] = [];

        editor.core.scene.customRenderTargets.forEach(rt => {
            if (!Tags.HasTags(rt) || !Tags.MatchesQuery(rt, 'added'))
                return;

            renderTargets.push({
                isProbe: false,
                serializationObject: rt.serialize()
            });
        });

        return renderTargets;
    }

    /**
     * Serializes the Materials
     */
    private static _SerializeMaterials (editor: Editor): Export.ProjectMaterial[] {
        const scene = editor.core.scene;
        const result: Export.ProjectMaterial[] = [];

        scene.materials.forEach(m => {
            if (!Tags.HasTags(m) || !Tags.MatchesQuery(m, 'added'))
                return;

            // Already serialized?
            const material = result.find(mat => mat.serializedValues.name === m.name);
            if (material)
                return;

            // Add new material
            const names: string[] = [];
            scene.meshes.map(mesh => {
                if (mesh.material === m)
                    names.push(mesh.name);
            });

            result.push({
                meshesNames: names,
                newInstance: true,
                serializedValues: m.serialize()
            });
        });

        return result;
    }

    /**
     * Serializes the Particle Systems
     */
    private static _SerializeParticleSystems (editor: Editor): Export.ParticleSystem[] {
        const scene = editor.core.scene;
        const result: Export.ParticleSystem[] = [];

        scene.particleSystems.forEach(ps => {
            if (!Tags.HasTags(ps) || !Tags.MatchesQuery(ps, 'added'))
                return;
            
            var psObj = {
                emitterPosition: (ps.emitter && ps.emitter instanceof Vector3) ? ps.emitter.asArray() : (ps.emitter && ps.emitter instanceof Node) ? ps.emitter.position.asArray() : null,
                hasEmitter: ps.emitter && ps.emitter instanceof AbstractMesh && !Tags.MatchesQuery(ps.emitter, 'added_particlesystem'),
                serializationObject: ps.serialize()
            };

            // Check base64 string
            if (ps instanceof ParticleSystem && ps.particleTexture['_buffer']) {
                // Add base64 string
                psObj.serializationObject.base64TextureName = ps.particleTexture.name;
                psObj.serializationObject.base64Texture = (<any>ps.particleTexture)._buffer;

                delete psObj.serializationObject.textureName;
            }

            result.push(psObj);
        });

        return result;
    }

    /**
     * Serializes the Effect Layers
     */
    private static _SerializeEffectLayers (editor: Editor): Export.EffectLayer[] {
        const result: Export.EffectLayer[] = [];

        if (SceneManager.GlowLayer)
            result.push({ name: 'GlowLayer', serializationObject: SceneManager.GlowLayer.serialize() });

        if (SceneManager.HighLightLayer)
            result.push({ name: 'HighLightLayer', serializationObject: SceneManager.HighLightLayer.serialize() });
        
        return result;
    }

    /**
     * Serializes the nodes
     */
    private static _SerializeNodes (editor: Editor): Export.Node[] {
        const scene = editor.core.scene;
        const nodes = (<(Node)[]> [])
            .concat(scene.meshes)
            .concat(scene.lights)
            .concat(scene.cameras)
            .filter(n => n !== editor.camera);

        const result: Export.Node[] = [];

        nodes.forEach((n: Node) => {
            let addNodeToProject = false;

            const node: Export.Node = {
                actions: null,
                animations: [],
                id: n.id,
                name: n.name,
                serializationObject: null,
                physics: null,
                type: n instanceof AbstractMesh ? 'Mesh' :
                      n instanceof Light ? 'Light' :
                      n instanceof Camera ? 'Camera' : 'Unknown!'
            };

            if (Tags.MatchesQuery(n, 'added_particlesystem'))
                addNodeToProject = true;
            
            if (Tags.HasTags(n) && Tags.MatchesQuery(n, 'added')) {
                addNodeToProject = true;

                if (n instanceof AbstractMesh)
                    node.serializationObject = SceneSerializer.SerializeMesh(n, false, false);
                else
                    node.serializationObject = (<Camera | Light> n).serialize();
            }

            // Animations
            n.animations.forEach(a => {
                if (!Tags.HasTags(a) || !Tags.MatchesQuery(a, 'added'))
                    return;
                
                addNodeToProject = true;

                node.animations.push({
                    events: [],
                    serializationObject: a.serialize(),
                    targetName: name,
                    targetType: 'Node'
                });
            });

            // Physics
            if (n instanceof AbstractMesh) {
                const impostor = n.getPhysicsImpostor();
                if (impostor && Tags.HasTags(impostor) && Tags.MatchesQuery(impostor, 'added')) {
                    addNodeToProject = true;

                    node.physics = {
                        physicsMass: impostor.getParam("mass"),
                        physicsFriction: impostor.getParam("friction"),
                        physicsRestitution: impostor.getParam("restitution"),
                        physicsImpostor: impostor.type
                    };
                }
            }

            // Actions
            const actionManager: ActionManager = n['actionManager'];
            if (actionManager && Tags.HasTags(actionManager) && Tags.MatchesQuery(actionManager, 'added')) {
                addNodeToProject = true;
                node.actions = actionManager.serialize(name);
            }

            // Add to nodes project?
            if (addNodeToProject)
                result.push(node);
        });

        return result;
    }
}
