import {
    Tools as BabylonTools,
    SceneSerializer,
    Node, AbstractMesh, Light, Camera,
    Tags, ActionManager,
    Vector3,
    ParticleSystem,
    FilesInputStore,
    BaseTexture,
    InstancedMesh,
} from 'babylonjs';
import { GLTF2Export, GLTFData } from 'babylonjs-serializers';

import SceneManager, { RemovedObject } from '../scene/scene-manager';
import SceneExporter from '../scene/scene-exporter';

import Window from '../gui/window';
import Form from '../gui/form';

import Tools from '../tools/tools';
import Editor from '../editor';

import Storage, { CreateFiles } from '../storage/storage';

import * as Export from '../typings/project';
import { IStringDictionary } from '../typings/typings';

import Extension from '../../extensions/extension';
import Extensions from '../../extensions/extensions';

export default class ProjectExporter {
    // Public members
    public static ProjectPath: string = null;
    public static ProjectExportFormat: 'babylon' | 'glb' | 'gltf' = 'babylon';

    // Private members
    private static _IsSaving: boolean = false;

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
            SceneExporter.CreateFiles(editor, this.ProjectExportFormat);

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

            Object.keys(FilesInputStore.FilesToLoad).forEach(async k => {
                const file = FilesInputStore.FilesToLoad[k];
                if (Tags.HasTags(file) && Tags.MatchesQuery(file, 'doNotExport'))
                    return;
                
                sceneFiles.push({ name: k, data: await Tools.ReadFileAsArrayBuffer(file) });
            });

            // Src files
            const srcFiles: CreateFiles[] = [
                { name: 'game.ts', doNotOverride: true, data: (await Tools.LoadFile<string>('assets/templates/template/src/game.ts')).replace('{{scene_format}}', this.ProjectExportFormat) }
            ];

            const storage = await Storage.GetStorage(editor);
            storage.openPicker('Create Template...', [
                { name: 'scene', folder: sceneFiles },
                { name: 'src', folder: srcFiles },
                { name: 'README.md', doNotOverride: true, data: await Tools.LoadFile<string>('assets/templates/template/README.md') },
                { name: 'index.html', doNotOverride: true, data: await Tools.LoadFile<string>('assets/templates/template/index.html') },
                { name: 'package.json', doNotOverride: true, data: await Tools.LoadFile<string>('assets/templates/template/package.json') },
                { name: 'tsconfig.json', doNotOverride: true, data: await Tools.LoadFile<string>('assets/templates/template/tsconfig.json') }
            ]);
        };
    }

    /**
     * Exports the editor project into the storage
     * @param editor the editor reference
     */
    public static async ExportProject (editor: Editor, exportAs: boolean = false): Promise<void> {
        if (this._IsSaving)
            return;
        
        // Saving
        this._IsSaving = true;
        editor.layout.lockPanel('bottom', 'Saving...', true);

        // Project
        const project = this.Export(editor);
        const content = JSON.stringify(project, null, '\t');

        // Storage
        const storage = await Storage.GetStorage(editor);

        // Add files
        const sceneFolder: CreateFiles = { name: 'scene', folder: [] };
        const root: CreateFiles[] = [
            { name: editor.projectFileName, data: content },
            sceneFolder
        ];

        for (const f in FilesInputStore.FilesToLoad) {
            const file = FilesInputStore.FilesToLoad[f];
            if (Tags.HasTags(file) && Tags.MatchesQuery(file, 'doNotExport'))
                continue;
            
            const ext = Tools.GetFileExtension(file.name);
            if (ext === 'editorproject' || file === editor.projectFile || file === editor.sceneFile)
                continue;
            
            sceneFolder.folder.push({ name: file.name, file: file, doNotOverride: true });
        }

        // Save
        storage.onCreateFiles = folder => this.ProjectPath = folder;
        await storage.openPicker('Export Editor Project...', root, exportAs ? null : this.ProjectPath);

        // Notify
        Tools.SetWindowTitle(editor.projectFileName);

        editor.layout.lockPanel('bottom', 'Saved.', false);
        setTimeout(() => editor.layout.unlockPanel('bottom'), 1000);

        // Finish
        this._IsSaving = false;
    }

    /**
     * Downloads the project's file
     * @param editor the editor reference
     */
    public static async DownloadProjectFile (editor: Editor): Promise<void> {
        // Project
        const content = JSON.stringify(this.Export(editor));
        const files: CreateFiles[] = [{ name: editor.projectFileName, data: content }];

        // Save
        if (Tools.IsElectron()) {
            const storage = await Storage.GetStorage(editor);
            storage.onCreateFiles = folder => this.ProjectPath = folder;
            
            const result = await storage.openPicker('Export Editor Project...', files, null, true);

            // Update project's informations
            if (result) {
                this.ProjectPath = result.path;
                editor.projectFileName = result.filename;
                Tools.SetWindowTitle(result.filename);
            }
        }
        else {
            const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(content), 'scene.editorproject');
            BabylonTools.Download(file, editor.projectFileName);
        }
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
            globalConfiguration: this._SerializeGlobalConfiguration(editor),
            lensFlares: null,
            materials: this._SerializeMaterials(editor),
            textures: this._SerializeTextures(editor),
            nodes: this._SerializeNodes(editor),
            particleSystems: this._SerializeParticleSystems(editor),
            physicsEnabled: editor.core.scene.isPhysicsEnabled(),
            renderTargets: this._SerializeRenderTargets(editor),
            requestedMaterials: null,
            shadowGenerators: this._SerializeShadowGenerators(editor),
            sounds: this._SerializeSounds(editor),
            gui: editor.core.uiTextures.map(ut => ut.serialize()),
            effectLayers: this._SerializeEffectLayers(editor),
            environmentHelper: SceneManager.EnvironmentHelper ? SceneManager.EnvironmentHelper['_options'] : null,
            assets: this._SerializeAssets(editor),
            removedObjects: this._SerializeRemovedObjects(),
            filesList: [],
            editionToolsStates: editor.edition.getToolsStates()
        };

        // Usable assets for extensions
        project.customMetadatas['AssetsExtension'] = { };
        
        const usableAssets = ['prefabs', 'particles'];
        usableAssets.forEach(ua => {
            const assets = project.assets[ua];
            if (!assets)
                return;
            
            project.customMetadatas['AssetsExtension'][ua] = assets.map(a => ({
                name: a.name,
                data: a.data
            }));
        });

        // Setup filesList
        for (const f in FilesInputStore.FilesToLoad) {
            const file = FilesInputStore.FilesToLoad[f];
            if (Tags.HasTags(file) && Tags.MatchesQuery(file, 'doNotExport'))
                continue;
            
            const ext = Tools.GetFileExtension(file.name);
            if (ext === 'editorproject' || file === editor.projectFile || file === editor.sceneFile)
                continue;

            project.filesList.push('scene/' + f);
        }

        // Finish
        SceneManager.Toggle(editor.core.scene);

        return project;
    }

    /**
     * Serializes the global configuration of the project
     */
    private static _SerializeGlobalConfiguration (editor: Editor): Export.GlobalConfiguration {
        const scene = editor.core.scene;
        delete editor.camera.metadata;

        return {
            serializedCamera: editor.camera.serialize(),
            environmentTexture: scene.environmentTexture ? scene.environmentTexture.serialize() : undefined,
            imageProcessingConfiguration: scene.imageProcessingConfiguration ? scene.imageProcessingConfiguration.serialize() : undefined,
            ambientColor: scene.ambientColor.asArray(),
            clearColor: scene.clearColor.asArray(),
            fog: {
                enabled: scene.fogEnabled,
                start: scene.fogStart,
                end: scene.fogEnd,
                density: scene.fogDensity,
                mode: scene.fogMode,
                color: scene.fogColor.asArray()
            }
        }
    }

    /**
     * Serializes the custom sounds
     */
    private static _SerializeSounds (editor: Editor): Export.Sound[] {
        const result: Export.Sound[] = [];
        const scene = editor.core.scene;

        if (!scene.soundTracks)
            return result;

        scene.soundTracks.forEach(st => {
            st.soundCollection.forEach(s => {
                const added = Tags.MatchesQuery(s, 'added');
                const modified = Tags.MatchesQuery(s, 'modified');

                if (!added && !modified)
                    return;

                result.push({
                    name: s.name,
                    serializationObject: added ? s.serialize() : Tools.Assign(this._MergeModifedProperties(s, s.serialize()), {
                        name: s.name
                    })
                });
            });
        });

        return result;
    }

    /**
     * Serializes the custom metadatas
     */
    private static _SerializeCustomMetadatas (editor: Editor): IStringDictionary<any> {
        const result = <any> { };

        // Notes
        if (editor.core.scene.metadata && editor.core.scene.metadata.notes)
            result.notes = editor.core.scene.metadata.notes;

        // Instances have been
        for (const e in Extensions.Instances)
            result[e] = Extensions.Instances[e].onSerialize();

        return result;
    }

    /**
     * Serializes the assets of the project being exported
     */
    private static _SerializeAssets (editor: Editor): IStringDictionary<any> {
        const result = <any> { };
        
        editor.assets.components.forEach(c => {
            // Extensions have their own import and export methods
            if (c instanceof Extension)
                return;

            if (c.onSerializeAssets)
                result[c.id] = c.onSerializeAssets();
        });

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

        // Render targets
        editor.core.scene.customRenderTargets.forEach(rt => {
            if (!Tags.HasTags(rt) || !Tags.MatchesQuery(rt, 'added'))
                return;

            renderTargets.push({
                isProbe: false,
                serializationObject: rt.serialize()
            });
        });

        // Reflection probes
        editor.core.scene.reflectionProbes && editor.core.scene.reflectionProbes.forEach(rp => {
            if (!Tags.HasTags(rp) || !Tags.MatchesQuery(rp, 'added'))
                return;

            renderTargets.push({
                isProbe: true,
                serializationObject: rp.serialize()
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
            const added = Tags.MatchesQuery(m, 'added');
            const modifed = Tags.MatchesQuery(m, 'modified');

            if (!Tags.HasTags(m) || (!added && !modifed))
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
                serializedValues: modifed ? this._MergeModifedProperties(m, m.serialize()) : m.serialize()
            });
        });

        return result;
    }

    /**
     * Serializes the textures
     */
    private static _SerializeTextures (editor: Editor): Export.ProjectTexture[] {
        const scene = editor.core.scene;
        const result: Export.ProjectTexture[] = [];

        scene.textures.forEach(t => {
            const added = Tags.MatchesQuery(t, 'added');
            const modified = Tags.MatchesQuery(t, 'modified');

            if (!added && !modified)
                return;
            
            const serializedValues = modified ? this._MergeModifedProperties(t, t.serialize()) : this._ClearOriginalMetadata(t.serialize());
            serializedValues.name = t.name;

            result.push({
                serializedValues: serializedValues,
                newInstance: added
            });
        })

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
     * Serializes the removed objects to keep references
     */
    public static _SerializeRemovedObjects (): IStringDictionary<RemovedObject> {
        const result: IStringDictionary<RemovedObject> = { };

        // Set type
        for (const key in SceneManager.RemovedObjects) {
            const value = SceneManager.RemovedObjects[key];

            result[key] = {
                serializationObject: value.serializationObject,
                type: Tools.GetConstructorName(value.reference),
                name: value.name
            };
        }

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
            // Ignore prefabs, already saved in assets
            const prefab = Tags.MatchesQuery(n, 'prefab') || Tags.MatchesQuery(n, 'prefab-master');
            if (prefab)
                return;
            
            let addNodeToProject = false;

            const node: Export.Node = {
                actions: null,
                animations: [],
                id: n.id,
                name: n.name,
                serializationObject: null,
                physics: null,
                added: Tags.MatchesQuery(n, 'added'),
                type: n instanceof InstancedMesh ? 'InstancedMesh' :
                      n instanceof AbstractMesh ? 'Mesh' :
                      n instanceof Light ? 'Light' :
                      n instanceof Camera ? 'Camera' : 'Unknown!'
            };

            if (Tags.MatchesQuery(n, 'added_particlesystem'))
                addNodeToProject = true;
            
            const modified = Tags.MatchesQuery(n, 'modified');

            if (Tags.HasTags(n) && (node.added || modified) && !prefab) {
                addNodeToProject = true;
                if (n instanceof AbstractMesh) {
                    // Instance
                    if (n instanceof InstancedMesh) {
                        if (node.added) {
                            node.serializationObject = this._ClearOriginalMetadata(n.serialize());
                            node.serializationObject.sourceMesh = n.sourceMesh.id;
                        } else {
                            node.serializationObject = this._MergeModifedProperties(n, n.serialize());
                        }
                    }
                    // Mesh
                    else {
                        node.serializationObject = SceneSerializer.SerializeMesh(n, false, false);
                        if (node.added) {
                            node.serializationObject.meshes.forEach(m => this._ClearOriginalMetadata(m));
                        }
                        else {
                            // Skeleton
                            if (node.serializationObject.skeletons && Tags.MatchesQuery(n.skeleton, 'modified')) {
                                node.skeleton = {
                                    serializationObject: this._MergeModifedProperties(n.skeleton, n.skeleton.serialize())
                                };
                                // Don't save bones
                                delete node.skeleton.serializationObject.bones;
                            }

                            // Remove unnecessary informations
                            delete node.serializationObject.geometries;
                            delete node.serializationObject.materials;
                            delete node.serializationObject.skeletons;
                            delete node.serializationObject.multiMaterials;

                            node.serializationObject.meshes.forEach((m, index) => {
                                const merge = this._MergeModifedProperties(n, m);
                                delete merge.instances;
                                delete merge.subMeshes;
                                delete merge.materialId;
                                node.serializationObject.meshes[index] = merge;
                            });
                        }
                    }
                }
                else {
                    node.serializationObject = modified ? this._MergeModifedProperties(n, (<Camera | Light> n).serialize()) : this._ClearOriginalMetadata((<Camera | Light> n).serialize());
                }
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

    /**
     * Clears the original metadata
     */
    private static _ClearOriginalMetadata (n: any): any {
        delete n.metadata;
        return n;
    }

    /**
     * Merges the original and current objects to keep only changes 
     */
    private static _MergeModifedProperties (source: any, current: any): any {
        const original = source.metadata && source.metadata.original;
        if (!original)
            return current;
        
        const result: any = { };
        for (const key in current) {
            const value = current[key];

            // Newly created
            if (original[key] === undefined) {
                result[key] = value;
                continue;
            }

            // Primitive types
            const type = typeof(value);
            switch (type.toLowerCase()) {
                case 'number':
                case 'boolean':
                case 'string':
                    if (current[key] !== original[key])
                        result[key] = value;
                    continue;
                default:
                    if (Array.isArray(value)) {
                        const o = original[key];
                        if (!o)
                            break;
                        
                        const diff = value.find((v, i) => v !== o[i]);
                        if (diff !== undefined)
                            result[key] = value;
                    }
                    else {
                        const currentObject = source[key];
                        const originalValue = original[key];

                        if (currentObject instanceof BaseTexture) {
                            // Check texture has changed
                            if (Tags.HasTags(originalValue) && Tags.MatchesQuery(originalValue, 'added') || originalValue.name !== value.name)
                                result[key] = value;
                            break;
                        }
                        else
                            // Not supported, just copy
                            result[key] = value;
                    }
                    break;
            }
        }

        // Keep id
        result.id = current.id;

        return this._ClearOriginalMetadata(result);
    }
}
