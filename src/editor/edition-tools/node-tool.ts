import {
    Node, AbstractMesh, Mesh, Tools as BabylonTools, Camera,
    InstancedMesh, SubMesh, Color3, ArcRotateCamera, SerializationHelper, Tags, Vector3, SceneLoader, Scene
} from 'babylonjs';
import { GUI } from 'dat-gui';

import AssetPicker from '../components/asset-picker';
import Picker from '../gui/picker';

import AbstractEditionTool from './edition-tool';
import SceneManager from '../scene/scene-manager';
import Tools from '../tools/tools';

import Extensions from '../../extensions/extensions';
import CodeExtension, { BehaviorNodeMetadata } from '../../extensions/behavior-code/code';
import LODExtension from '../../extensions/lod/index';

export default class NodeTool extends AbstractEditionTool<Node> {
    // Public members
    public divId: string = 'NODE-TOOL';
    public tabName: string = 'Properties';

    // Private members
    private _parentId: string = '';
    private _enabled: boolean = true;
    private _currentMaterial: string = '';

    private _currentCamera: boolean = false;

    private _meshPivot: Vector3 = Vector3.Zero();

    private _highlightEnabled: boolean = false;
    private _currentObject: Mesh | InstancedMesh | Camera = null;

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof Node || object instanceof SubMesh;
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(object: Node | SubMesh): void {
        // Get node
        const node = object instanceof SubMesh ? object.getMesh() : object;
        
        super.update(node);

        // Misc.
        const scene = node.getScene();
        this._enabled = node.isEnabled();

        // Reset
        if ((object instanceof Mesh || object instanceof InstancedMesh || object instanceof Camera) && object.metadata && object.metadata.original) {
            this._currentObject = object;
            this.tool.add(this, 'resetToOriginal').name('Reset to original');
        }

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(node, 'name').name('Name').onFinishChange(r => this.editor.graph.renameNode(node.id, r));
        common.add(this, '_enabled').name('Enabled').onFinishChange(r => node.setEnabled(r));

        if (node instanceof AbstractMesh)
            common.add(node, 'isVisible').name('Is Visible');

        if (object instanceof Mesh) {
            // Material
            const materials = ['None'].concat(this.editor.core.scene.materials.map(m => m.name));
            this._currentMaterial = object.material ? object.material.name : 'None';
            common.add(this, '_currentMaterial', materials).name('Material').onFinishChange(r => {
                if (r === 'None')
                    return (object.material = null);
                
                const material = this.editor.core.scene.getMaterialByName(r);
                object.material = material;
            });
        }

        if (node.state !== undefined)
            common.add(node, 'state').name('State');

        // Parenting
        const parenting = this.tool.addFolder('Parenting');
        parenting.open();

        const parents: string[] = ['None'];
        scene.meshes.forEach(m => m.name !== node.name && parents.push(m.name));
        scene.lights.forEach(l => l.name !== node.name && parents.push(l.name));
        scene.cameras.forEach(c => c.name !== node.name && parents.push(c.name));

        this._parentId = node.parent ? node.parent.id : parents[0];
        parenting.add(this, '_parentId', parents).name('Parent').onChange(n => {
            node.parent = scene.getNodeByName(n);
            this.editor.graph.setParent(node.id, node.parent ? node.parent.id : this.editor.graph.root);
        });

        // Transforms
        const transforms = this.tool.addFolder('Transfroms');
        transforms.open();

        if (node['position']) this.tool.addVector(transforms, 'Position', node['position']).open();
        if (node['rotation']) this.tool.addVector(transforms, 'Rotation', node['rotation'], () => {
            if (node instanceof AbstractMesh && node.rotationQuaternion) {
                // Convert to vector
                const result = node.rotationQuaternion.toEulerAngles();
                node.rotationQuaternion = null;
                node.rotation.copyFrom(result);
            }
        }).open();
        if (node['scaling']) this.tool.addVector(transforms, 'Scaling', node['scaling']).open();
        if (node['direction']) this.tool.addVector(transforms, 'Direction', node['direction']).open();
        
        if (node instanceof AbstractMesh && node.getPivotPoint()) {
            this._meshPivot.copyFrom(node.getPivotPoint());
            this.tool.addVector(transforms, 'Pivot', this._meshPivot, () => {
                node.setPivotPoint(this._meshPivot);
            });
        }

        // Abstract mesh
        if (node instanceof AbstractMesh) {
            // Options
            const options = this.tool.addFolder('Options');
            options.open();

            node.metadata = node.metadata || { };
            node.metadata.baseConfiguration = node.metadata.baseConfiguration || { };
            node.metadata.baseConfiguration.isPickable = node.metadata.baseConfiguration.isPickable || false;
            options.add(node.metadata.baseConfiguration, 'isPickable').name('Is Pickable');
            options.add(node, 'isBlocker').name('Is Blocker');
            
            if (!(node instanceof InstancedMesh)) {
                // Instances
                const instances = this.tool.addFolder('Instances');
                instances.open();

                instances.add(this, 'createInstance').name('Create Instance...');
            }

            // HighLight Layer
            if (node instanceof Mesh && SceneManager.HighLightLayer) {
                const highlight = this.tool.addFolder('Highlight Layer');
                highlight.open();

                this._highlightEnabled = SceneManager.HighLightLayer.hasMesh(node);
                highlight.add(this, '_highlightEnabled').name('Highlight Enabled').onFinishChange(r => {
                    if (r) {
                        SceneManager.HighLightLayer.addMesh(node, Color3.White());
                    }
                    else
                        SceneManager.HighLightLayer.removeMesh(node);

                    this.update(node);
                });

                if (this._highlightEnabled) {
                    for (const m in SceneManager.HighLightLayer['_meshes']) {
                        const mesh = SceneManager.HighLightLayer['_meshes'][m];
                        if (mesh.mesh !== node)
                            continue;
                        
                        this.tool.addColor(highlight, 'HighLight Color', mesh.color).open();
                        highlight.add(mesh, 'glowEmissiveOnly').name('Glow Emissive Only');
                    }
                }
            }
        }
        // Camera
        else if (node instanceof Camera) {
            this._currentCamera = scene.activeCamera === node;

            const camera = this.tool.addFolder('Camera');
            camera.open();
            camera.add(this, '_currentCamera').name('Active Camera').onFinishChange(r => {
                scene.activeCamera = r ? node : this.editor.camera;
            });

            if (node instanceof ArcRotateCamera) {
                camera.add(node, 'panningSensibility').step(1).name('Panning Sensibility');
                camera.add(node.inputs.attached.mousewheel, 'wheelPrecision').step(0.01).name('Zoom Factor');
            }
            
            if (node['speed'] !== undefined) {
                camera.add(node, 'speed').step(0.01).name('Speed');
            }
            
            camera.add(node, 'minZ').step(0.01).name('Min Z');
            camera.add(node, 'maxZ').step(0.01).name('Max Z');
            camera.add(node, 'fov').step(0.01).name('Fov');
        }

        // LOD
        if (node instanceof Mesh)
            this._addLodLevelOptions();

        // Animations
        if (node.animations && node.animations.length > 0 || (node instanceof Mesh && node.skeleton)) {
            const animations = this.tool.addFolder('Animations');
            animations.open();
            animations.add(this, 'playAnimations').name('Play Animations');
        }

        // Scripts
        this.addScriptsConfiguration(node);
    }

    private async _addLodLevelOptions (): Promise<void> {
        // Cast as mesh
        const mesh = <Mesh> this.object;

        // Get extension
        await Tools.ImportScript('./build/src/extensions/lod/index.js');
        const ext = Extensions.RequestExtension<LODExtension>(this.editor.core.scene, 'LODExtension');
        const metadata = ext.getMetadataFromMeshId(this.object.id);
        
        const lod = this.tool.addFolder('Level Of Details (LOD)');
        lod.open();
        lod.add(this, '_addLodLevel').name('Add Level Of Detail...');

        const levels = mesh.getLODLevels();
        levels.forEach((level, index) => {
            const f = lod.addFolder(`${level.mesh.name} (${level.mesh.id})`);
            f.open();
            f.add(level, 'distance').name('Distance').onChange((r) => {
                mesh['_sortLODLevels']();
                metadata.levels[index].distance = r;
            });

            const o = { remove: () => {
                mesh.removeLODLevel(level.mesh);
                level.mesh.dispose(true, false);
                metadata.levels.splice(index, 1);
                this.update(mesh);
            } };
            f.add(o, 'remove').name('Remove Level');
        });
    }

    // Adds a new LOD level to the mesh.
    private async _addLodLevel (): Promise<void> {
        // Load LOD extension.
        await Tools.ImportScript('./build/src/extensions/lod/index.js');
        const ext = Extensions.RequestExtension<LODExtension>(this.editor.core.scene, 'LODExtension');

        // Choose mesh asset.
        const asset = await AssetPicker.Show<File>(this.editor, this.editor.assets.meshes);
        if (!asset)
            return;

        // Load the scene.
        const currentMesh = <Mesh> this.object;
        
        const result = await SceneLoader.ImportMeshAsync('', "file:", asset.data, this.editor.core.scene);
        result.particleSystems.forEach((ps) => ps.dispose(true));
        result.skeletons.forEach((s) => s.dispose());
        result.meshes.forEach((m) => m.id = BabylonTools.RandomId());
        
        const meshes = result.meshes.filter((m) => m instanceof Mesh);
        if (!meshes.length)
            return;

        let mesh = <Mesh> meshes[0];

        if (meshes.length > 1) {
            await new Promise<void>((resolve) => {
                const picker = new Picker('Multiple meshes, choose the LOD mesh');
                picker.addItems(meshes);
                picker.open((items) => {
                    if (!items[0])
                        return resolve();
                    
                    mesh = <Mesh> meshes[items[0].id];
                    resolve();
                });
            });
        }

        if (!mesh) {
            result.meshes.forEach((m) => m.dispose(false, true));
            return;
        }

        // Setup metadata.
        mesh.material = null;

        const metadata = ext.getMetadataFromMeshId(this.object.id);
        if (!metadata) {
            ext.datas.push({ meshId: this.object.id, levels: [
                { distance: 50, meshSerializationObject: ext.serializeMesh(mesh) }
            ] });
        } else {
            metadata.levels.push({ distance: 50, meshSerializationObject: ext.serializeMesh(mesh) });
        }

        mesh.doNotSerialize = true;
        mesh.id = BabylonTools.RandomId();
        mesh.material = currentMesh.material;
        mesh.skeleton = currentMesh.skeleton;
        currentMesh.addLODLevel(50, mesh);

        // Clear
        result.meshes.forEach((m) => {
            if (m.material && m.material !== currentMesh.material)
                m.material.dispose(true, true);
            
            if (m !== mesh)
                m.dispose(true, true);
        });

        // Refresh tool.
        this.update(this.object);
    }

    /**
     * Resets the current light to the original one
     */
    protected resetToOriginal (): void {
        const m = this._currentObject.metadata.original;

        // Parse
        SerializationHelper.Parse(() => this._currentObject, m, this._currentObject.getScene(), 'file:');

        // Parenting
        if (m.parentId && (!this._currentObject.parent || this._currentObject.parent.id !== m.parentId)) {
            this._currentObject.parent = this._currentObject.getScene().getMeshByID(m.parentId);
            this.editor.graph.setParent(this._currentObject.id, m.parentId);
        } else if (this._currentObject.parent) {
            this._currentObject.parent = null;
            this.editor.graph.setParent(this._currentObject.id, this.editor.graph.root);
        }

        // Rotation quaternion
        if (this._currentObject instanceof AbstractMesh && m.rotationQuaternion === undefined)
            this._currentObject.rotationQuaternion = null;

        setTimeout(() => {
            Tags.RemoveTagsFrom(this.object, 'modified');
            this.editor.graph.updateObjectMark(this.object);
        }, 1);
        this.editor.inspector.updateDisplay();
    }

    /**
     * Creates a new instance
     */
    protected createInstance (): void {
        const instance = (<Mesh>this.object).createInstance('New instance ' + BabylonTools.RandomId());
        instance.id = BabylonTools.RandomId();
        Tags.AddTagsTo(instance, 'added');

        this.editor.graph.add({
            id: instance.id,
            img: this.editor.graph.getIcon(instance),
            text: instance.name,
            data: instance
        }, this.editor.graph.root);

        this.editor.inspector.setObject(instance);
        this.editor.graph.select(instance.id);
    }

    /**
     * Plays the animations of the current node
     * (including skeleton if exists)
     */
    protected playAnimations (): void {
        const scene = this.editor.core.scene;

        if (this.object.animations && this.object.animations.length > 0) {
            const bounds = SceneManager.GetAnimationFrameBounds([this.object]);

            scene.stopAnimation(this.object);
            scene.beginAnimation(this.object, bounds.min, bounds.max, false, 1.0);
        }

        if (this.object instanceof Mesh && this.object.skeleton) {
            const bounds = SceneManager.GetAnimationFrameBounds(this.object.skeleton.bones);

            scene.stopAnimation(this.object.skeleton);
            scene.beginAnimation(this.object.skeleton, bounds.min, bounds.max, false, 1.0);
        }
    }

    /**
     * Adds all the scripts metadatas to configure custom user values
     */
    protected addScriptsConfiguration (node: Node): void {
        let scripts: GUI = null;

        const behaviorExtension = Extensions.RequestExtension<CodeExtension>(this.editor.core.scene, 'BehaviorExtension');
        if (behaviorExtension && node.metadata && node.metadata.behavior) {
            const data = <BehaviorNodeMetadata> node.metadata.behavior;

            // For each metadata, get parameters
            data.metadatas.forEach(m => {
                const code = this.editor.core.scene.metadata.behaviorScripts.find(s => s.id === m.codeId);
                let params: any = null;
                try {
                    params = behaviorExtension.getConstructor(code, node, true);

                    if (!params.ctor)
                        return;
                } catch (e) {
                    return;
                }

                // Create root folder
                if (!scripts) {
                    scripts = this.tool.addFolder('Scripts');
                    scripts.open();
                }
                
                // Set params
                m.params = m.params || { };

                // Add folder and children
                const script = scripts.addFolder(code.name);
                script.open();

                for (const p in params) {
                    if (p === 'ctor')
                        continue;
                    
                    m.params[p] = m.params[p] === undefined ? params[p] : m.params[p];
                    if (typeof m.params[p] !== typeof params[p])
                        m.params[p] = params[p];

                    // Types
                    switch (Tools.GetConstructorName(params[p])) {
                        case 'Boolean':
                            script.add(m.params, p);
                            break;
                        case 'Number':
                            script.add(m.params, p);
                            break;
                        case 'String':
                            script.add(m.params, p);
                            break;
                        case 'Vector2':
                        case 'Vector3':
                        case 'Vector4':
                            this.tool.addVector(script, p, m.params[p]).open();
                            break;
                        case 'Color3':
                        case 'Color4':
                            this.tool.addColor(script, p, m.params[p]).open();
                            break;
                        default:
                            debugger;
                            console.info('Not supported data type');
                            break;
                    }
                }
            });
        }
    }
}
