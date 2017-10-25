import {
    Scene, Node, Mesh, AbstractMesh, Light, Camera,
    Tools as BabylonTools
} from 'babylonjs';

import Editor from '../editor';
import Graph, { GraphNode } from '../gui/graph';

export default class EditorGraph {
    // Public members
    public graph: Graph;
    public root: string = 'ROOT';

    constructor(protected editor: Editor) {
        // Build graph
        this.graph = new Graph('SceneGraph');
        this.graph.build('SCENE-GRAPH');

        // Events
        this.graph.onClick = (id, data) => this.editor.edition.setObject(data);
    }

    /**
    * Rename the node with id "id"
    * @param id the id of the node
    * @param name the new name/id
    */
    public renameNode(id: string, name: string): void {
        const node = <GraphNode>this.graph.element.get(id);
        node.id = name;
        node.text = name;

        this.graph.element.refresh();
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
            scene.meshes.forEach(m => !m.parent && nodes.push(m));
            scene.lights.forEach(l => !l.parent && nodes.push(l));
            scene.cameras.forEach(c => !c.parent && nodes.push(c));
        }

        nodes.forEach(n => {
            // Create a random ID if not defined
            if (!n.id)
                n.id = BabylonTools.RandomId();

            this.graph.element.add(root ? root.id : this.root, <GraphNode>{
                id: n.id,
                text: n.name,
                img: this.getIcon(n),
                data: n
            });
        });
    }

    /**
    * Returns the icon related to the object type
    * @param object 
    */
    protected getIcon(obj: Node): string {
        if (obj instanceof AbstractMesh) {
            return 'icon-mesh';
        } else if (obj instanceof Light) {
            return 'icon-light';
        } else if (obj instanceof Camera) {
            return 'icon-camera';
        }

        return null;
    }
}
