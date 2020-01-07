import {
    Scene, Node, AbstractMesh, Light, Camera, Mesh,
    Sound,
    ParticleSystem, GPUParticleSystem,
    PostProcess,
    Tools as BabylonTools,
    Skeleton,
    Tags,
    TransformNode,
    InstancedMesh
} from 'babylonjs';
import { AdvancedDynamicTexture, Image } from 'babylonjs-gui';

import Editor from '../editor';
import Tools from '../tools/tools';

import Tree, { TreeNode, TreeContextMenuItem } from '../gui/tree';
import UndoRedo from '../tools/undo-redo';

import ScenePicker from '../scene/scene-picker';
import SceneManager from '../scene/scene-manager';

export default class EditorGraph {
    // Public members
    public tree: Tree;
    public root: string = 'ROOT';
    public gui: string = 'GUI';

    public currentObject: any = this.editor.core.scene;

    /**
     * Constructor
     * @param editor the editor reference
     */
    constructor (protected editor: Editor) {
        this.tree = new Tree('SceneTree');
        this.tree.multipleSelection = true;
        this.tree.wholerow = true;
        this.tree.build('SCENE-GRAPH');

        // Events
        this.tree.onClick = (id, data: any) => {
            this.currentObject = data;
            this.editor.scenePicker.setGizmoAttachedMesh(data);
            this.editor.core.onSelectObject.notifyObservers(data, undefined, this);
        };

        this.tree.onDblClick = (id, data: any) => {
            if (data.globalPosition || data.getAbsolutePosition)
                ScenePicker.CreateAndPlayFocusAnimation(this.editor.camera.getTarget(), data.globalPosition || data.getAbsolutePosition(), this.editor.camera);
        };

        this.tree.onRename = (id, name, data: any) => {
            if (!data.name)
                return false;

            const oldName = data.name;
            data.name = name;
            this.editor.inspector.updateDisplay();

            UndoRedo.Push({
                object: data,
                property: 'name',
				from: oldName,
				to: name,
                fn: (type) => {
                    this.tree.rename(data.id, type === 'from' ? oldName : name);
					this.editor.inspector.updateDisplay();
                }
            });

            return true;
        };

        this.tree.onContextMenu = (id, data: any) => {
            if (!data.clone || data === this.editor.camera || data === this.editor.core.scene)
                return [];
            
            const result: TreeContextMenuItem[] = [];
            const selectedCount = this.tree.getAllSelected().length;

            if (selectedCount === 1) {
                if (data.globalPosition || data.getAbsolutePosition)
                    result.push({ id: 'focus', text: 'Focus', img: 'icon-focus', separatorAfter: true, callback: async () => await this.onMenuClick('focus') });
                
                if (data instanceof Mesh)
                    result.push({ id: 'create-prefab', text: 'Create Prefab', img: 'icon-add', multiple: true, separatorBefore: true, callback: async (node) => await this.onMenuClick('create-prefab', node) });
                
                if (data instanceof AbstractMesh)
                    result.push({ id: 'set-material', text: 'Set Material...', img: 'icon-shaders', separatorAfter: true, callback: async () => await this.onMenuClick('set-material') });

                if (data instanceof Node || data instanceof Scene || data instanceof ParticleSystem) {
                    result.push({ id: 'attach-script', text: 'Attach Existing Script...', img: 'icon-behavior-editor', callback: async () => await this.onMenuClick('attach-script') });
                    result.push({ id: 'add-script', text: 'Add Script...', img: 'icon-behavior-editor', separatorAfter: true, callback: async () => await this.onMenuClick('add-script') });
                }

                if (data.clone)
                    result.push({ id: 'clone',  text: 'Clone',  img: 'icon-clone', multiple: true, callback: async (node) => await this.onMenuClick('clone', node) });
            }
            
            result.push.apply(result, [
                { id: 'delete', text: 'Delete', img: 'icon-error', multiple: true, callback: async (node) => await this.onMenuClick('remove', node) }
            ]);
            
            return result;
        };

        this.tree.onCanDrag = (id, data) => !(data instanceof Scene);
        this.tree.onDrag = (node: any, parent: any) => {
            // Add modified tag
            Tags.AddTagsTo(node, 'modified');

            // Search operation
            if (node instanceof ParticleSystem) {
                if (!(parent instanceof AbstractMesh))
                    return false;

                // Undo redo
                const oldEmitter = node.emitter;
                const newEmitter = parent;

                UndoRedo.Push({ object: node, property: 'emitter', from: oldEmitter, to: newEmitter, fn: (type) => {
                    if (type === 'from')
                        this.tree.setParent(node.id, oldEmitter['id']);
                    else
                        this.tree.setParent(node.id, newEmitter.id);
                }});

                // Apply
                node.emitter = parent;

                return true;
            }

            if (node instanceof Node) {
                if (!(parent instanceof Node) && !(parent instanceof Scene))
                    return false;

                // Undo redo
                const oldParent = node.parent;
                const newParent = parent instanceof Scene ? null : parent;

                UndoRedo.Push({ object: node, property: 'parent', from: oldParent, to: newParent, fn: (type) => {
                    if (type === 'from')
                        this.tree.setParent(node.id, oldParent ? oldParent.id : this.root);
                    else
                        this.tree.setParent(node.id, newParent ? newParent.id : this.root);
                }});

                // Apply
                node.parent = newParent;

                return true;
            }

            if (node instanceof Sound) {
                // TODO: undo-redo for sounds
                // Need to get current attached mesh
                if (parent instanceof Scene) {
                    node.spatialSound = false;
                    node.detachFromMesh();

                    return true;
                }
                
                if (parent instanceof AbstractMesh) {
                    node.spatialSound = true;
                    node.attachToMesh(parent);

                    return true;
                }
            }

            // No action, remove tag and reset
            Tags.RemoveTagsFrom(node, 'modified');
            return false;
        };

        this.tree.onCopy = (source, target, parent) => {
            if (source.data.clone) {
                target.data = source.data.clone();
                target.data.name = source.data.name;
                target.data.id = BabylonTools.RandomId();

                if (parent instanceof Node)
                    target.data.parent = parent;

                return target.data;
            }
            return null;
        };

        // Search
        const search = $('#SCENE-GRAPH-SEARCH');
        search.keyup(() => {
            this.tree.search(<string> search.val());
        });

        // Observer
        this.editor.core.onSelectObject.add((node: Node, ev) => ev.target !== this && node && this.tree.select(node.id));
    }

    /**
    * Rename the node with id "id"
    * @param id the id of the node
    * @param name the new name/id
    */
    public renameNode (id: string, name: string): void {
        this.tree.rename(id, name);
    }

    /**
     * Set parent of the given node (id)
     * @param id the id of the node
     * @param parentId the parent id
     */
    public setParent (id: string, parentId: string): void {
        this.tree.setParent(id, parentId);
    }

    /**
     * Adds a new node
     * @param node: the node to add
     * @param parentId: the parent id of the node to add
     */
    public add (node: TreeNode, parentId: string): void {
        this.tree.add(node, parentId);
    }

    /**
     * Selects the given node id
     * @param id the node id
     */
    public select (id: string): void {
        this.tree.select(id);
    }

    /**
     * Returns the selected node
     */
    public getSelected (): TreeNode {
        return this.tree.getSelected();
    }

    /**
     * Returns all the selected nodes
     */
    public getAllSelected (): TreeNode[] {
        return this.tree.getAllSelected();
    }

    /**
     * Returns a anode 
     * @param data: the data to search
     */
    public getByData (data: any): TreeNode {
        return <TreeNode> this.tree.get(data.id || data.name);
    }

    /**
     * Clears the graph
     */
    public clear (): void {
        this.tree.clear();
    }

    /**
     * Fills the tree
     * @param scene: the root scene
     * @param root: the root node
     */
    public fill(scene: Scene = this.editor.core.scene, root?: Node): void {
        let nodes = root ? /*root.getDescendants()*/root.getChildren() : [];

        if (!root) {
            this.tree.add({
                id: this.root,
                text: 'Scene',
                img: 'icon-scene',
                data: scene
            });

            this.tree.select(this.root);
            this.editor.inspector.setObject(scene);

            // Sort nodes alphabetically
            Tools.SortAlphabetically(scene.cameras, 'name');
            Tools.SortAlphabetically(scene.lights, 'name');
            Tools.SortAlphabetically(scene.meshes, 'name');

            // Set nodes
            scene.cameras.forEach(c => !c.parent && nodes.push(c));
            if (scene.cameras.indexOf(this.editor.camera) === -1)
                nodes.push(this.editor.camera);
            
            scene.lights.forEach(l => !l.parent && nodes.push(l));
            scene.meshes.forEach(m => !m.parent && nodes.push(m));
            scene.transformNodes.forEach(t => !t.parent && nodes.push(t));

            // Fill sounds
            this.fillSounds(scene, scene);
        }
        else {
            Tools.SortAlphabetically(nodes, 'name');
        }

        // Add nodes
        nodes.forEach(n => {
            // Add the node.
            this.addNode(scene, n, root);

            // TODO: wait for parse and serialize for GUI
            // parentNode.count += this.fillGuiTextures(n);

            // Fill descendants
            this.fill(scene, n);
        });

        // Expand scene as default
        if (!root) {
            this.tree.expand(this.root);
            this.configure();
        }
    }

    /**
     * adds the given node with its descendants in the scene graph.
     * @param scene the scene containing the node.
     * @param node the node to add in the scene graph with its descendants.
     */
    public addNodeRecursively (scene: Scene, node: Node): void {
        this.addNode(scene, node);
        this.fill(scene, node);
    }

    /**
     * Adds the given node to the graph.
     * @param scene the scene containing the node.
     * @param node the node to add.
     */
    public addNode (scene: Scene, node: Node, root: Node = node.parent): void {
        // Hide prefabs, keep only masters
        if (Tags.MatchesQuery(node, 'prefab'))
            return;

        // Should be hidden?
        if (Tags.MatchesQuery(node, 'graph-hidden'))
            return;
        
        // Create a random ID if not defined
        if (!node.id || this.tree.get(node.id)) {
            node.id = BabylonTools.RandomId();
            if (node.metadata && node.metadata.original)
                node.metadata.original.id = node.id;
        }

        node.id = node.id.replace(/ /g, '');

        // Instance?
        const parent = root ? root.id : this.root;
        const parentNode = this.tree.add({
            id: node.id,
            text: node.name,
            img: this.getIcon(node),
            data: node
        }, parent);

        // Cannot add
        if (!parentNode)
            return;

        // Mesh
        if (node instanceof AbstractMesh) {
            // Sub meshes
            if (node.subMeshes && node.subMeshes.length > 1) {
                node.subMeshes.forEach((sm, index) => {
                    const smMaterial = sm.getMaterial();

                    this.tree.add({
                        id: node.id + 'submesh_' + index,
                        text: smMaterial ? smMaterial.name : sm.getMesh().name + ' (Unnamed submesh)',
                        img: this.getIcon(node),
                        data: sm
                    }, node.id);
                });
            }

            // Skeleton
            if (node.skeleton) {
                this.tree.add({
                    id: node.skeleton.id || BabylonTools.RandomId(),
                    text: node.skeleton.name,
                    img: this.getIcon(node.skeleton),
                    data: node.skeleton
                }, node.id);
            }
        }

        // Check particle systems
        scene.particleSystems.forEach(ps => {
            if (ps.emitter === node) {
                this.tree.add({
                    id: ps.id,
                    text: ps.name,
                    img: this.getIcon(ps),
                    data: ps
                }, node.id);
            }
        });

        // Check lens flares
        scene.lensFlareSystems && scene.lensFlareSystems.forEach(lf => {
            if (lf.getEmitter() === node) {
                this.tree.add({
                    id: lf.id,
                    text: lf.name,
                    img: this.getIcon(lf),
                    data: lf
                }, node.id);
            }
        });

        // Camera? Add post-processes
        if (node instanceof Camera) {
            scene.postProcesses.forEach(p => {
                const camera = p.getCamera();
                if (camera !== node)
                    return;
            
                this.tree.add({
                    id: p.name + BabylonTools.RandomId(),
                    text: p.name,
                    img: this.getIcon(p),
                    data: p
                }, node.id);
            });
        }

        // Sounds
        this.fillSounds(scene, node);
    }

    /**
     * Updates the mark of the given object in graph
     * @param obj the object to mark
     */
    public updateObjectMark (obj: any): void {
        const added = Tags.MatchesQuery(obj, 'added');
        const modified = Tags.MatchesQuery(obj, 'modified');
        this.tree.markNode(obj.id, modified && !added);
    }

    /**
     * Configures the graph
     */
    public configure (): void {
        const scene = this.editor.core.scene;
        const configure = n => {
            // Type
            let type = 'default';

            if (Tags.HasTags(n) && (Tags.MatchesQuery(n, 'prefab') || Tags.MatchesQuery(n, 'prefab-master')))
                type = 'italic';
            
            if (n.metadata && (
                n.metadata.behavior && n.metadata.behavior.metadatas.length > 0 ||
                n.metadata.behaviorGraph && n.metadata.behaviorGraph.metadatas.length > 0
            )) {
                type = type === 'italic' ? 'boldItalic' : 'bold';
            }

            this.tree.setType(n.id, type);

            // Marked
            this.updateObjectMark(n);
        };

        scene.meshes.forEach(n => configure(n));
        scene.cameras.forEach(n => configure(n));
        scene.lights.forEach(n => configure(n));
    }

    /**
    * Returns the icon related to the object type
    * @param object 
    */
    public getIcon (obj: any): string {
        if (obj instanceof AbstractMesh) {
            return 'icon-mesh';
        } else if (obj instanceof Light) {
            return 'icon-light';
        } else if (obj instanceof Camera) {
            return 'icon-camera';
        } else if (obj instanceof ParticleSystem || obj instanceof GPUParticleSystem) {
            return 'icon-particles';
        } else if (obj instanceof Skeleton) {
            return 'icon-animated-mesh';
        } else if (obj instanceof PostProcess) {
            return 'icon-helpers';
        } else if (obj instanceof Sound) {
            return 'icon-sound';
        } else if (obj instanceof TransformNode) {
            return 'icon-position';
        } else if (obj instanceof AdvancedDynamicTexture) {
            return 'icon-ground';
        } else if (obj instanceof Image) {
            return 'icon-dynamic-texture';
        }

        return null;
    }

    /**
     * Fills the sounds giving the scene and the root node (attached mesh or scene)
     * @param scene: the scene containing the sound
     * @param root: the root node to check
     */
    protected fillSounds (scene: Scene, root: Scene | Node): number {
        // Set sounds
        if (!scene.mainSoundTrack || scene.mainSoundTrack.soundCollection.length === 0)
            return;

        let count = 0;

        scene.mainSoundTrack.soundCollection.forEach(s => {
            s['id'] = s['id'] || BabylonTools.RandomId();

            if (root === scene && !s['_connectedTransformNode']) {
                this.tree.add({
                    id: s['id'],
                    text: s.name,
                    img: this.getIcon(s),
                    data: s
                }, this.root);
            }
            else if (s['_connectedTransformNode'] === root) {
                this.tree.add({
                    id: s['id'],
                    text: s.name,
                    img: this.getIcon(s),
                    data: s
                }, (<Node> root).id);

                count++;
            }
        });

        return count;
    }

    /**
     * Fills the GUI advanced textures
     * @param root: the node to check GUI is attached to
     */
    protected fillGuiTextures (root: Node): number {
        let count = 0;

        if (!root) {
            // Advanced ui textures
            this.editor.core.uiTextures.forEach(ut => {
                this.tree.add(<TreeNode>{
                    id: ut.name,
                    text: ut.name,
                    img: this.getIcon(ut),
                    data: ut
                }, this.gui);
            });
        }
        else {
            // Attached to mesh
            this.editor.core.uiTextures.forEach(ut => {
                
            });
        }

        return count;
    }

    /**
     * On the user clicks on a context menu item
     * @param id the context menu item id
     * @param node the related tree node
     */
    public async onMenuClick (id: string, node?: TreeNode): Promise<void> {
        node = node || this.getSelected();
        if (!node)
            return;
        
        switch (id) {
            // Focus
            case 'focus':
                ScenePicker.CreateAndPlayFocusAnimation(this.editor.camera.getTarget(), node.data.globalPosition || node.data.getAbsolutePosition(), this.editor.camera);
                break;

            // Create prefab
            case 'create-prefab':
                await this.editor.assets.prefabs.createPrefab(node.data);
                break;
            // Add Material
            case 'set-material':
                await this.editor.addEditPanelPlugin('material-viewer', false, 'Materials Viewer', node.data, true);
                break;

            // Set Script
            case 'attach-script':
                await this.editor.addEditPanelPlugin('behavior-editor', false, 'Code Editor', node.data, false, true);
                break;
            // Add Script
            case 'add-script':
                await this.editor.addEditPanelPlugin('behavior-editor', false, 'Code Editor', node.data, true);
                break;
            
            // Clone
            case 'clone':
                if (!node || !(node.data instanceof Node) || !node.data['clone'])
                    return;
                
                const clone = node.data['clone']();
                clone.position && (clone.position.y += 2);
                clone.name = node.data.name + ' Cloned';
                clone.id = BabylonTools.RandomId();

                if (node.data['skeleton']) {
                    clone.skeleton = node.data['skeleton'].clone();
                    clone.skeleton.name = node.data['skeleton'].name;
                    clone.skeleton.id = node.data['skeleton'].id;
                }

                const parent = clone.parent ? clone.parent.id :this.root;
                this.tree.add({ id: clone.id, text: clone.name, img: this.getIcon(clone), data: clone }, parent);
                
                // Setup this
                this.currentObject = clone;
                this.editor.core.onSelectObject.notifyObservers(clone);

                // Update graph
                this.configure();

                break;

            // Remove
            case 'remove':
                // Don't remove editor's camera
                if (node.data === this.editor.camera || node.data === this.editor.core.scene)
                    return;
                
                // Undo / redo
                const scene = this.editor.core.scene;
                const descendants = (!node.data.getDescendants ? [node.data] : [node.data].concat(node.data.getDescendants())).map(n => {
                    const array: any[] = n instanceof AbstractMesh ? scene.meshes : 
                                         n instanceof Light ? scene.lights :
                                         n instanceof Camera ? scene.cameras :
                                         n instanceof TransformNode ? scene.transformNodes :
                                         n instanceof Sound ? scene.mainSoundTrack.soundCollection :
                                         n instanceof ParticleSystem ? scene.particleSystems :
                                         [];
                    const particleSystems = scene.particleSystems.filter(p => p.emitter === n);

                    const sounds: Sound[] = [];
                    scene.soundTracks.forEach(st => st.soundCollection.forEach(s => s['_connectedTransformNode'] === n && sounds.push(s)));

                    return {
                        node: n,
                        array: array,
                        instancedMeshIndex: n instanceof InstancedMesh ? n.sourceMesh.instances.indexOf(n) : null,
                        environmentHelper: SceneManager.EnvironmentHelper && [<Node> SceneManager.EnvironmentHelper.rootMesh].concat(SceneManager.EnvironmentHelper.rootMesh.getDescendants()).find(d => d === n) && SceneManager.EnvironmentHelper,
                        sounds: sounds.map(s => ({
                            soundTrackId: s.soundTrackId,
                            isPlaying: s.isPlaying,
                            treeNode: this.getByData(s),
                            sound: s
                        })),
                        particleSystems: particleSystems.map(p => ({
                            system: p,
                            treeNode: this.getByData(p)
                        })),
                    };
                });

                UndoRedo.Push({
                    scope: node.id,
                    undo: () => {
                        // Re-add in tree graph
                        this.tree.add(Object.assign({ }, node, { img: this.getIcon(node.data) }), node.parent);

                        // Re-add descendants
                        descendants.forEach(d => {
                            // Test if doesn't exists
                            if (scene.getNodeByID(d.node.id))
                                return Tags.RemoveTagsFrom(d.node, 'removed');

                            for (const st of scene.soundTracks) {
                                if (st.soundCollection.find(s => s.name === d.node.name))
                                    return Tags.RemoveTagsFrom(d.node, 'removed');
                            }
                            
                            // Enabled
                            if (d.node instanceof Node)
                                d.node.setEnabled(true);

                            // Instanced mesh
                            if (d.instancedMeshIndex !== null)
                                (<InstancedMesh> d.node).sourceMesh.instances.splice(d.instancedMeshIndex, 0, d.node);

                            // Environment helper
                            if (d.environmentHelper)
                                SceneManager.EnvironmentHelper = d.environmentHelper;
                            
                            // Push
                            d.array.push(d.node);
                            d.particleSystems.forEach(p => {
                                scene.particleSystems.push(p.system);
                                this.tree.add(Object.assign({ }, p.treeNode, { img: this.getIcon(p.system) }), node.id);
                                Tags.RemoveTagsFrom(p.system, 'removed');
                            });
                            d.sounds.forEach(s => {
                                scene.soundTracks[s.soundTrackId].soundCollection.push(s.sound);
                                s.isPlaying && s.sound.play();
                                this.tree.add(Object.assign({ }, s.treeNode, { img: this.getIcon(s.sound) }), node.id);
                                Tags.RemoveTagsFrom(s.sound, 'removed');
                            });

                            Tags.RemoveTagsFrom(d.node, 'removed');

                            // Remove reference
                            if (d.node.metadata && d.node.metadata.original) {
                                delete SceneManager.RemovedObjects[d.node instanceof Sound ? d.node.name : d.node.id];
                            }
                        });

                        // Fill children
                        if (node.data instanceof Node)
                            this.fill(scene, node.data);

                        setTimeout(() => {
                            // Select node
                            this.tree.select(node.id);
                            this.tree.onClick(node.id, node.data);
                            this.currentObject = node.data;

                            // Update graph
                            this.configure();
                        }, 1);
                    },
                    redo: () => {
                        descendants.forEach((d) => {
                            if (d.node instanceof Sound)
                                d.node.stop();

                            // Enabled false
                            if (d.node instanceof Node)
                                d.node.setEnabled(false);

                            // Instanced mesh
                            if (d.instancedMeshIndex !== null)
                                (<InstancedMesh> d.node).sourceMesh.instances.splice(d.instancedMeshIndex, 1);

                            // Environment helper
                            if (d.environmentHelper)
                                SceneManager.EnvironmentHelper = null;

                            // Splice
                            d.array.splice(d.array.indexOf(d.node), 1);
                            d.particleSystems.forEach(p => {
                                scene.particleSystems.splice(scene.particleSystems.indexOf(p.system), 1);
                                Tags.AddTagsTo(p.system, 'removed');
                            });
                            d.sounds.forEach(s => {
                                scene.soundTracks[s.soundTrackId].soundCollection.splice(scene.soundTracks[s.soundTrackId].soundCollection.indexOf(s.sound), 1);
                                Tags.AddTagsTo(s.sound, 'removed');

                                // Save reference
                                if (s.sound['metadata'] && s.sound['metadata'].original) {
                                    const savedRemovedObject = {
                                        reference: s.sound,
                                        type: Tools.GetConstructorName(s.sound),
                                        serializationObject: Tools.Assign<any>({ }, s.sound['metadata'].original),
                                        name: s.sound.name
                                    };
                                    savedRemovedObject.serializationObject.metadata = Tools.Assign({ }, savedRemovedObject.serializationObject.metadata, {
                                        original: undefined
                                    });
                                    SceneManager.RemovedObjects[s.sound.name] = savedRemovedObject;
                                }
                            });

                            Tags.AddTagsTo(d.node, 'removed');

                            // Save reference
                            if (d.node.metadata && d.node.metadata.original) {
                                const savedRemovedObject = {
                                    reference: d.node,
                                    type: Tools.GetConstructorName(d.node),
                                    serializationObject: Tools.Assign<any>({ }, d.node.metadata.original, {
                                        sourceMesh: d.node instanceof InstancedMesh ? d.node.sourceMesh.id : undefined
                                    }),
                                    name: d.node.name
                                };
                                savedRemovedObject.serializationObject.metadata = Tools.Assign({ }, savedRemovedObject.serializationObject.metadata, {
                                    original: undefined
                                });
                                SceneManager.RemovedObjects[d.node instanceof Sound ? d.node.name : d.node.id] = savedRemovedObject;
                            }
                        });

                        this.tree.remove(node.id);

                        // Reset gizmo
                        this.editor.scenePicker.setGizmoAttachedMesh(null);

                        // Update graph
                        this.currentObject = null;
                        this.configure();
                    }
                });

                // Gui
                if (node.data instanceof AdvancedDynamicTexture) {
                    const ui = this.editor.core.uiTextures.find(ut => ut === node.data);
                    const index = this.editor.core.uiTextures.indexOf(ui);

                    if (index !== -1)
                        this.editor.core.uiTextures.splice(index, 1);
                }
                break;
            
            // Other
            default:
                break;
        }
    }
}