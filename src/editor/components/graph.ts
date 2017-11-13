import {
    Scene, Node, Mesh, AbstractMesh, Light, Camera, InstancedMesh,
    ParticleSystem, GPUParticleSystem, IParticleSystem,
    Tools as BabylonTools
} from 'babylonjs';

import Editor from '../editor';
import Graph, { GraphNode } from '../gui/graph';

export default class EditorGraph {
    // Public members
    public graph: Graph;
    public root: string = 'ROOT';

    public currentObject: any = this.editor.core.scene;

    constructor(protected editor: Editor) {
        // Build graph
        this.graph = new Graph('SceneGraph');
        this.graph.build('SCENE-GRAPH');

        // Events
        this.graph.onClick = (id, data) => {
            this.currentObject = data;
            this.editor.core.onSelectObject.notifyObservers(data);
        };

        this.editor.core.onSelectObject.add((node: Node) => this.select(node.id));
    }

    /**
    * Rename the node with id "id"
    * @param id the id of the node
    * @param name the new name/id
    */
    public renameNode (id: string, name: string): void {
        const node = <GraphNode>this.graph.element.get(id);
        node.id = name;
        node.text = name;

        this.graph.element.refresh();
    }

    /**
     * Set parent of the given node (id)
     * @param id the id of the node
     * @param parentId the parent id
     */
    public setParent (id: string, parentId: string): void {
        const parent = <GraphNode>this.graph.element.get(parentId);
        const node = <GraphNode>this.graph.element.get(id);

        parent.count = parent.count ? parent.count++ : 1;

        this.graph.element.remove(node.id);
        this.graph.element.add(parent.id, node);
        this.graph.element.expandParents(node.id);
    }

    /**
     * Adds a new node
     * @param node: the node to add
     * @param parentId: the parent id of the node to add
     */
    public add (node: GraphNode, parentId: string): void {
        this.graph.element.add(parentId, node);
    }

    /**
     * Selects the given node id
     * @param id the node id
     */
    public select (id: string): void {
        this.graph.element.expandParents(id);
        this.graph.element.select(id);
        this.graph.element.scrollIntoView(id);
    }

    /**
     * Clears the graph
     */
    public clear (): void {
        this.graph.clear();
    }

    /**
     * Fills the graph
     * @param scene: the root scene
     * @param root: the root node
     */
    public fill(scene: Scene = this.editor.core.scene, root?: Node): void {
        let nodes = root ? root.getDescendants() : [];
        if (!root) {
            // Set scene's node
            this.graph.element.add(<GraphNode>{
                id: this.root,
                text: 'Scene',
                img: 'icon-scene',
                data: scene
            });

            this.graph.element.expand(this.root);
            this.graph.element.select(this.root);
            this.editor.edition.setObject(scene);

            // Set nodes
            scene.cameras.forEach(c => !c.parent && nodes.push(c));
            scene.lights.forEach(l => !l.parent && nodes.push(l));
            scene.meshes.forEach(m => !m.parent && nodes.push(m));
        }

        nodes.forEach(n => {
            // Create a random ID if not defined
            if (!n.id)
                n.id = BabylonTools.RandomId();

            // Instance?
            let parent = root ? root.id : this.root;
            
            this.graph.element.add(parent, <GraphNode>{
                id: n.id,
                text: n.name,
                img: this.getIcon(n),
                data: n
            });

            // Check particle systems
            scene.particleSystems.forEach(ps => {
                if (ps.emitter === n) {
                    this.graph.element.add(n.id, <GraphNode>{
                        id: ps.id,
                        text: ps.name,
                        img: this.getIcon(ps),
                        data: ps
                    });
                }
            });
        });
    }

    /**
    * Returns the icon related to the object type
    * @param object 
    */
    public getIcon(obj: Node | IParticleSystem): string {
        if (obj instanceof AbstractMesh) {
            return 'icon-mesh';
        } else if (obj instanceof Light) {
            return 'icon-light';
        } else if (obj instanceof Camera) {
            return 'icon-camera';
        } else if (obj instanceof ParticleSystem || obj instanceof GPUParticleSystem) {
            return 'icon-particles';
        }

        return null;
    }
}
