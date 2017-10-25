import { Node, AbstractMesh, Mesh, Tools } from 'babylonjs';
import AbstractEditionTool from './edition-tool';

export default class NodeTool extends AbstractEditionTool<Node> {
    // Public members
    public divId: string = 'NODE-TOOL';
    public tabName: string = 'Node';

    // Private members
    private _parentId: string = '';
    private _enabled: boolean = true;

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof Node;
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(node: Node): void {
        super.update(node);

        // Misc.
        const scene = node.getScene();
        this._enabled = node.isEnabled();

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(node, 'name').name('Name').onFinishChange(r => this.core.graph.renameNode(node.id, r));
        common.add(this, '_enabled').name('Enabled').onFinishChange(r => node.setEnabled(r));

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
            this.core.graph.setParent(node.id, node.parent ? node.parent.id : this.core.graph.root);
        });

        // Transforms
        const transforms = this.tool.addFolder('Transfroms');
        transforms.open();

        if (node['position']) this.tool.addVector(transforms, 'Position', node['position']).open();
        if (node['rotation']) this.tool.addVector(transforms, 'Rotation', node['rotation']).open();
        if (node['scaling']) this.tool.addVector(transforms, 'Scaling', node['scaling']).open();

        // Abstract mesh
        if (node instanceof AbstractMesh) {
            // Collisions
            const collisions = this.tool.addFolder('Collisions');
            collisions.open();

            collisions.add(node, 'checkCollisions').name('Check Collisions');
            collisions.add(node, 'isBlocker').name('Is Blocker');

            // Rendering
            const rendering = this.tool.addFolder('Rendering');
            rendering.open();

            rendering.add(node, 'receiveShadows').name('Receive Shadows');
            rendering.add(node, 'applyFog').name('Apply Fog');
            rendering.add(node, 'isVisible').name('Is Visible');

            // Instances
            const instances = this.tool.addFolder('Instances');
            instances.open();

            instances.add(this, 'createInstance').name('Create Instance...');
        }
    }

    /**
     * Creates a new instance
     */
    protected createInstance(): void {
        const instance = (<Mesh>this.object).createInstance('New instance ' + Tools.RandomId());
        instance.id = Tools.RandomId();

        this.core.graph.add({
            id: instance.id,
            img: this.core.graph.getIcon(instance),
            text: instance.name,
            data: instance,
            count: 0
        }, this.object.id);

        this.core.edition.setObject(instance);
        this.core.graph.select(instance.id);
    }
}
