import {
    Scene,
    Mesh, Node,
    Texture, StandardMaterial, Material,
    Color3, Vector3,
    Effect,
    SubMesh, _InstancesBatch
} from 'babylonjs';

import Editor from '../editor';

export default class SceneIcons {
    // Public members
    public scene: Scene;

    public cameraTexture: Texture;
    public lightTexture: Texture;

    public plane: Mesh;
    public material: StandardMaterial;

    // Protected members
    protected editor: Editor;

    /**
     * Constructor
     * @param editor: the editor instance 
     */
    constructor (editor: Editor) {
        this.editor = editor;
        this.editor.core.updates.push(this);

        // Create scene
        this.scene = new Scene(editor.core.engine);
        this.scene.autoClear = false;
        this.scene.postProcessesEnabled = false;

        // Create textures
        this.cameraTexture = this.createTexture('css/images/camera.png');
        this.lightTexture = this.createTexture('css/images/light.png');

        // Create material
        this.material = new StandardMaterial('SceneIcons', this.scene);
        this.material.diffuseTexture = this.lightTexture;
        this.material.emissiveColor = Color3.White();
        this.material.useAlphaFromDiffuseTexture = true;
        this.material.disableDepthWrite = false;
        this.material.disableLighting = true;
        this.scene.materials.pop();

        // Create plane
        this.plane = Mesh.CreatePlane('SceneIconsPlane', 1, this.scene, false);
        this.plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        this.scene.meshes.pop();
        this.plane.material = this.material;
    }

    /**
     * On post update the scenes
     */
    public onPostUpdate (): void {
        this.scene.activeCamera = this.editor.core.scene.activeCamera;
        this.scene.render();

        // Alpha testing
        const scene = this.editor.core.scene;
        const engine = this.editor.core.engine;
        engine.setAlphaTesting(true);

        // Render
        const subMesh = this.plane.subMeshes[0];
        if (!this.material.isReadyForSubMesh(this.plane, subMesh, false))
            return;

        const effect = subMesh.effect;
        if (!effect)
            return;

        const batch = this.plane._getInstancesRenderList(subMesh._id);

        engine.enableEffect(effect);
        this.plane._bind(subMesh, effect, Material.TriangleFillMode);

        // Cameras
        this.material.diffuseTexture = this.cameraTexture;
        this.renderPlane(batch, subMesh, scene.cameras, n => {
            if (n === scene.activeCamera)
                return false;

            this.plane.position.copyFrom(n.position);
            return true;
        });

        // Lights
        this.material.diffuseTexture = this.lightTexture;
        this.renderPlane(batch, subMesh, scene.lights, n => {
            if (!n.getAbsolutePosition)
                return false;

            this.plane.position.copyFrom(n.getAbsolutePosition());
            return true;
        });
    }

    /**
     * Render the given objects
     * @param batch: the instances render list
     * @param subMesh: the submesh to render
     * @param nodes: the nodes to render
     * @param configure: callback to know if render or not the node
     */
    protected renderPlane (batch: _InstancesBatch, subMesh: SubMesh, nodes: Node[], configure: (node: any) => boolean): void {
        const effect = subMesh.effect;

        nodes.forEach(n => {
            if (!configure(n))
                return;

            const distance = Vector3.Distance(this.editor.core.scene.activeCamera.position, this.plane.position) * 0.03;
            this.plane.scaling = new Vector3(distance, distance, distance), 
            this.plane.computeWorldMatrix(true);

            this.scene._cachedMaterial = null;
            this.material._preBind(effect);
            this.material.bindForSubMesh(this.plane.getWorldMatrix(), this.plane, subMesh);

            this.plane._processRendering(subMesh, effect, Material.TriangleFillMode, batch, false, (isInstance, world) => {
                effect.setMatrix("world", world);
            });
        });
    }

    /**
     * Creates a new texture
     * @param url: the url of the texture
     */
    protected createTexture (url: string): Texture {
        const texture = new Texture(url, this.scene);
        texture.hasAlpha = true;

        this.scene.textures.pop();

        return texture;
    }
}
