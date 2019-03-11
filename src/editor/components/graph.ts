import {
    Scene, Node, AbstractMesh, Light, Camera, Mesh,
    Sound,
    ParticleSystem, GPUParticleSystem,
    PostProcess,
    Tools as BabylonTools,
    Skeleton,
    Tags,
    TransformNode
} from 'babylonjs';
import { AdvancedDynamicTexture, Image } from 'babylonjs-gui';

import Editor from '../editor';
import Tools from '../tools/tools';

import Tree, { TreeNode, TreeContextMenuItem } from '../gui/tree';
import UndoRedo from '../tools/undo-redo';

import ScenePicker from '../scene/scene-picker';

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
            this.editor.edition.updateDisplay();

            UndoRedo.Push({
                object: data,
                property: 'name',
				from: oldName,
				to: name,
                fn: (type) => {
                    this.tree.rename(data.id, type === 'from' ? oldName : name);
					this.editor.edition.updateDisplay();
                }
            });

            return true;
        };

        this.tree.onContextMenu = (id, data: any) => {
            if (!data.clone)
                return [];
            
            const result: TreeContextMenuItem[] = [];

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

            result.push.apply(result, [
                { id: 'delete', text: 'Delete', img: 'icon-error', multiple: true, callback: async (node) => await this.onMenuClick('remove', node) }
            ]);
            
            return result;
        };

        this.tree.onCanDrag = (id, data) => !(data instanceof Scene);
        this.tree.onDrag = (node: any, parent: any) => {
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
            this.editor.edition.setObject(scene);

            // Sort nodes alphabetically
            Tools.SortAlphabetically(scene.cameras, 'name');
            Tools.SortAlphabetically(scene.lights, 'name');
            Tools.SortAlphabetically(scene.meshes, 'name');

            // Set nodes
            scene.cameras.forEach(c => !c.parent && nodes.push(c));
            scene.lights.forEach(l => !l.parent && nodes.push(l));
            scene.meshes.forEach(m => !m.parent && nodes.push(m));

            // Fill sounds
            this.fillSounds(scene, scene);
        }
        else {
            Tools.SortAlphabetically(nodes, 'name');
        }

        // Add nodes
        nodes.forEach(n => {
            // Hide prefabs, keep only masters
            if (Tags.MatchesQuery(n, 'prefab'))
                return;
            
            // Create a random ID if not defined
            if (!n.id || this.tree.get(n.id))
                n.id = BabylonTools.RandomId();

            // Instance?
            const parent = root ? root.id : this.root;
            const parentNode = this.tree.add({
                id: n.id,
                text: n.name,
                img: this.getIcon(n),
                data: n
            }, parent);

            // Cannot add
            if (!parentNode)
                return;

            // Mesh
            if (n instanceof AbstractMesh) {
                // Sub meshes
                if (n.subMeshes && n.subMeshes.length > 1) {
                    n.subMeshes.forEach((sm, index) => {
                        this.tree.add({
                            id: n.id + 'submesh_' + index,
                            text: sm.getMaterial().name,
                            img: this.getIcon(n),
                            data: sm
                        }, n.id);
                    });
                }

                // Skeleton
                if (n.skeleton) {
                    this.tree.add({
                        id: n.skeleton.id || BabylonTools.RandomId(),
                        text: n.skeleton.name,
                        img: this.getIcon(n.skeleton),
                        data: n.skeleton
                    }, n.id);
                }
            }

            // Check particle systems
            scene.particleSystems.forEach(ps => {
                if (ps.emitter === n) {
                    this.tree.add({
                        id: ps.id,
                        text: ps.name,
                        img: this.getIcon(ps),
                        data: ps
                    }, n.id);
                }
            });

            // Check lens flares
            scene.lensFlareSystems && scene.lensFlareSystems.forEach(lf => {
                if (lf.getEmitter() === n) {
                    this.tree.add({
                        id: lf.id,
                        text: lf.name,
                        img: this.getIcon(lf),
                        data: lf
                    }, n.id);
                }
            });

            // Camera? Add post-processes
            if (n instanceof Camera) {
                scene.postProcesses.forEach(p => {
                    const camera = p.getCamera();
                    if (camera !== n)
                        return;
                
                    this.tree.add({
                        id: p.name + BabylonTools.RandomId(),
                        text: p.name,
                        img: this.getIcon(p),
                        data: p
                    }, n.id);
                });
            }

            // Sounds
            this.fillSounds(scene, n);

            // TODO: wait for parse and serialize for GUI
            // parentNode.count += this.fillGuiTextures(n);

            // Fill descendants
            this.fill(scene, n);
        });

        // Expand scene as default
        if (!root)
            this.tree.expand(this.root);
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
        if (scene.soundTracks.length === 0 || scene.soundTracks[0].soundCollection.length === 0)
            return;

        let count = 0;

        scene.soundTracks.forEach(st => {
            st.soundCollection.forEach(s => {
                if (root === scene && !s['_connectedMesh']) {
                    this.tree.add({
                        id: s['id'] || BabylonTools.RandomId(),
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    }, this.root);
                }
                else if (s['_connectedMesh'] === root) {
                    this.tree.add({
                        id: s['id'] || BabylonTools.RandomId(),
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    }, (<Node> root).id);

                    count++;
                }
            });
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
                break;

            // Remove
            case 'remove':
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

                    return {
                        node: n,
                        array: array,
                        particleSystems: particleSystems.map(p => ({
                            system: p,
                            treeNode: this.getByData(p)
                        })),
                    };
                });

                UndoRedo.Push({
                    undo: () => {
                        // Re-add in tree graph
                        this.tree.add(Object.assign({ }, node, { img: this.getIcon(node.data) }), node.parent);

                        // Re-add descendants
                        descendants.forEach(d => {
                            d.array.push(d.node);
                            d.particleSystems.forEach(p => {
                                scene.particleSystems.push(p.system);
                                this.tree.add(Object.assign({ }, p.treeNode, { img: this.getIcon(p.system) }), node.id);
                            });
                        });

                        // Fill children
                        if (node.data instanceof Node)
                            this.fill(scene, node.data);

                        // Select node
                        this.tree.onClick(node.id, node.data);
                    },
                    redo: () => {
                        descendants.forEach((d) => {
                            if (d.node instanceof Sound)
                                d.node.stop();
                            
                            d.array.splice(d.array.indexOf(d.node), 1);
                            d.particleSystems.forEach(p => {
                                scene.particleSystems.splice(scene.particleSystems.indexOf(p.system), 1);
                            });
                        });

                        this.tree.remove(node.id);

                        // Reset gizmo
                        this.editor.scenePicker.setGizmoAttachedMesh(null);
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