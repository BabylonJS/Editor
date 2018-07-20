import {
    Scene, Node, AbstractMesh, Light, Camera,
    Sound,
    ParticleSystem, GPUParticleSystem,
    PostProcess,
    Animation,
    Tools as BabylonTools,
    Skeleton
} from 'babylonjs';
import { AdvancedDynamicTexture, Image } from 'babylonjs-gui';

import Editor from '../editor';
import Tools from '../tools/tools';

import Tree, { TreeNode } from '../gui/tree';
import UndoRedo from '../tools/undo-redo';

import ScenePicker from '../scene/scene-picker';

// import { BehaviorMetadata } from '../../extensions/behavior/code';

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
        this.tree.build('SCENE-GRAPH');

        // Events
        this.tree.onClick = (id, data: any) => {
            this.currentObject = data;
            this.editor.scenePicker.setGizmoAttachedMesh(data);
            this.editor.core.onSelectObject.notifyObservers(data);
        };

        this.tree.onDblClick = (id, data: any) => {
            if (data.globalPosition || data.getAbsolutePosition)
                ScenePicker.CreateAndPlayFocusAnimation(this.editor.camera.getTarget(), data.globalPosition || data.getAbsolutePosition(), this.editor.camera);
        };

        this.tree.onContextMenu = (id, data: any) => {
            if (!data.clone)
                return [];

            const result = [
                { id: 'delete', text: 'Delete', img: 'icon-error', callback: () => this.onMenuClick('remove') },
                { id: 'clone',  text: 'Clone',  img: 'icon-clone', callback: () => this.onMenuClick('clone') }
            ];

            if (data.globalPosition || data.getAbsolutePosition)
                result.push({ id: 'focus', text: 'Focus', img: 'icon-focus', callback: () => this.onMenuClick('focus') });
            
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

        // Search
        const search = $('#SCENE-GRAPH-SEARCH');
        search.keyup(() => {
            this.tree.search(<string> search.val());
        });

        // Observer
        this.editor.core.onSelectObject.add((node: Node) => node && this.tree.select(node.id));
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
     * Returns the selected node id
     */
    public getSelected (): TreeNode {
        return this.tree.getSelected();
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
        let nodes = root ? root.getDescendants() : [];

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
            // Create a random ID if not defined
            if (!n.id)
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

                // Metadatas
                /*
                if (n.metadata && n.metadata.behavior && n.metadata.behavior.metadatas.length > 0) {
                    const code = <BehaviorMetadata> n.metadata.behavior;
                    const codeNode = this.tree.add({
                        id: n.id + 'behavior',
                        text: 'Scripts',
                        data: code,
                        img: 'icon-behavior-editor'
                    }, n.id);

                    code.metadatas.forEach(m => {
                        this.tree.add({
                            id: BabylonTools.RandomId(),
                            text: m.name,
                            data: m,
                            img: 'icon-behavior-editor'
                        }, codeNode.id);
                    });
                }
                */
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
    protected onMenuClick (id: string): void {
        const node = this.getSelected();
        if (!node)
            return;
        
        switch (id) {
            // Remove
            case 'remove':
                // TODO: implement undo-redo and do not dispose objects
                node.data && node.data.dispose && node.data.dispose();
                this.tree.remove(node.id);

                // Gui
                if (node.data instanceof AdvancedDynamicTexture) {
                    const ui = this.editor.core.uiTextures.find(ut => ut === node.data);
                    const index = this.editor.core.uiTextures.indexOf(ui);

                    if (index !== -1)
                        this.editor.core.uiTextures.splice(index, 1);
                }
                break;
            // Clone
            case 'clone':
                if (!node || !(node.data instanceof Node))
                    return;
                
                const clone = node && node.data && node.data['clone'] && node.data['clone']();
                clone.name = node.data.name + ' Cloned';
                clone.id = BabylonTools.RandomId();

                const parent = clone.parent ? clone.parent.id :this.root;
                this.tree.add({ id: clone.id, text: clone.name, img: this.getIcon(clone), data: clone }, parent);
                
                // Setup this
                this.currentObject = clone;
                this.editor.core.onSelectObject.notifyObservers(clone);
                break;
            // Focus
            case 'focus':
                ScenePicker.CreateAndPlayFocusAnimation(this.editor.camera.getTarget(), node.data.globalPosition || node.data.getAbsolutePosition(), this.editor.camera);
                break;
            // Other
            default:
                break;
        }
    }
}