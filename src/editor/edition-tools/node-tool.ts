import { Node, AbstractMesh, Mesh, Tools, Camera, InstancedMesh, SubMesh, Color3 } from 'babylonjs';
import AbstractEditionTool from './edition-tool';
import SceneManager from '../scene/scene-manager';

export default class NodeTool extends AbstractEditionTool<Node> {
    // Public members
    public divId: string = 'NODE-TOOL';
    public tabName: string = 'Node';

    // Private members
    private _parentId: string = '';
    private _enabled: boolean = true;
    private _currentMaterial: string = '';

    private _currentCamera: boolean = false;

    private _highlightEnabled: boolean = false;

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

        // Common
        const common = this.tool.addFolder('Common');
        common.open();
        common.add(node, 'name').name('Name').onFinishChange(r => this.editor.graph.renameNode(node.id, r));
        common.add(this, '_enabled').name('Enabled').onFinishChange(r => node.setEnabled(r));

        if (object instanceof Mesh) {
            const materials = ['None'].concat(this.editor.core.scene.materials.map(m => m.name));
            this._currentMaterial = object.material ? object.material.name : 'None';
            common.add(this, '_currentMaterial', materials).name('Material').onFinishChange(r => {
                if (r === 'None')
                    return (object.material = null);
                
                const material = this.editor.core.scene.getMaterialByName(r);
                object.material = material;
            });
        }

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
        if (node['rotation']) this.tool.addVector(transforms, 'Rotation', node['rotation']).open();
        if (node['scaling']) this.tool.addVector(transforms, 'Scaling', node['scaling']).open();
        if (node['direction']) this.tool.addVector(transforms, 'Direction', node['direction']).open();

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

            if (node['speed'] !== undefined)
                camera.add(node, 'speed').step(0.01).name('Speed');

            camera.add(node, 'minZ').step(0.01).name('Min Z');
            camera.add(node, 'maxZ').step(0.01).name('Max Z');
            camera.add(node, 'fov').step(0.01).name('Fov');
        }

        // Animations
        if (node.animations && node.animations.length > 0 || (node instanceof Mesh && node.skeleton)) {
            const animations = this.tool.addFolder('Animations');
            animations.open();
            animations.add(this, 'playAnimations').name('Play Animations');
        }
    }

    /**
     * Creates a new instance
     */
    protected createInstance (): void {
        const instance = (<Mesh>this.object).createInstance('New instance ' + Tools.RandomId());
        instance.id = Tools.RandomId();

        this.editor.graph.add({
            id: instance.id,
            img: this.editor.graph.getIcon(instance),
            text: instance.name,
            data: instance
        }, this.object.id);

        this.editor.edition.setObject(instance);
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
}
