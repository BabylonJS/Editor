import {
    Scene, Node, Mesh, AbstractMesh, Light, Camera, InstancedMesh,
    Sound,
    ParticleSystem, GPUParticleSystem, IParticleSystem,
    PostProcess,
    Tools as BabylonTools
} from 'babylonjs';
import { AdvancedDynamicTexture, Image } from 'babylonjs-gui';

import Editor from '../editor';
import Tools from '../tools/tools';

import Tree, { TreeNode } from '../gui/tree';

export default class EditorTree {
    // Public members
    public tree: Tree;
    public root: string = 'ROOT';

    public currentObject: any = this.editor.core.scene;

    constructor (protected editor: Editor) {
        this.tree = new Tree('SceneTree');
        this.tree.build('SCENE-TREE');

        // Events
        this.tree.onClick = (id, data: any) => {
            this.currentObject = data;
            this.editor.core.onSelectObject.notifyObservers(data);
        };

        this.tree.onContextMenu = () => {
            return [];
        };

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
        /*
        const parent = <GraphNode>this.graph.element.get(parentId);
        const node = <GraphNode>this.graph.element.get(id);

        parent.count = parent.count ? parent.count++ : 1;

        this.graph.element.remove(node.id);
        this.graph.element.add(parent.id, node);
        this.graph.element.expandParents(node.id);
        */
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

            // Sub meshes
            if (n instanceof AbstractMesh && n.subMeshes && n.subMeshes.length > 1) {

                n.subMeshes.forEach((sm, index) => {
                    this.tree.add({
                        id: n.id + 'submesh_' + index,
                        text: sm.getMaterial().name,
                        img: this.getIcon(n),
                        data: sm
                    }, n.id);
                });
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
            scene.lensFlareSystems.forEach(lf => {
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
                n._postProcesses.forEach(p => {
                    this.tree.add({
                        id: p.name,
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
                        id: s.name,
                        text: s.name,
                        img: this.getIcon(s),
                        data: s
                    }, this.root);
                }
                else if (s['_connectedMesh'] === root) {
                    this.tree.add({
                        id: s.name,
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
}