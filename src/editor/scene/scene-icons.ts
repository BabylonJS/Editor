import {
    Scene,
    Mesh, Node,
    Texture, StandardMaterial, Material,
    Color3, Vector3,
    Effect,
    SubMesh, _InstancesBatch, IParticleSystem, PickingInfo
} from 'babylonjs';

import Editor from '../editor';

export default class SceneIcons {
    // Public members
    public scene: Scene;

    public cameraTexture: Texture;
    public lightTexture: Texture;
    public particleTexture: Texture;

    public camerasPlanes: Mesh[] = [];
    public lightsPlanes: Mesh[] = [];
    public particleSystemsPlanes: Mesh[] = [];

    public camerasMaterial: StandardMaterial;
    public lightsMaterial: StandardMaterial;
    public particleSystemsMaterial: StandardMaterial;

    // Protected members
    protected editor: Editor;
    
    // Private members
    private _lastCamerasCount: number = -1;
    private _lastLightsCount: number = -1;
    private _lastParticleSystemsCount: number = -1;

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
        this.scene.preventDefaultOnPointerDown = false;

        // Create textures
        this.cameraTexture = this.createTexture('css/images/camera.png');
        this.lightTexture = this.createTexture('css/images/light.png');
        this.particleTexture = this.createTexture('css/images/particles.png');

        // Create materials
        this.camerasMaterial = new StandardMaterial('CamerasMaterial', this.scene);
        this.camerasMaterial.diffuseTexture = this.cameraTexture;
        this.camerasMaterial.emissiveColor = Color3.White();
        this.camerasMaterial.disableDepthWrite = false;
        this.camerasMaterial.disableLighting = true;

        this.lightsMaterial = this.camerasMaterial.clone('LightsMaterial');
        this.lightsMaterial.diffuseTexture = this.lightTexture;

        this.particleSystemsMaterial = this.camerasMaterial.clone('ParticleSystemsMaterial');
        this.particleSystemsMaterial.diffuseTexture = this.particleTexture;
    }

    /**
     * On before render the scene
     */
    public onPreUpdate (): void {
        const scene = this.editor.core.scene;
        
        // Cameras
        if (scene.cameras.length !== this._lastCamerasCount) {
            this._lastCamerasCount = scene.cameras.length;
            this.createPlanes(this.camerasPlanes, this.camerasMaterial, this._lastCamerasCount);
        }

        // Lights
        if (scene.lights.length !== this._lastLightsCount) {
            this._lastLightsCount = scene.lights.length;
            this.createPlanes(this.lightsPlanes, this.lightsMaterial, this._lastLightsCount);
        }

        // Particle systems
        if (scene.particleSystems.length !== this._lastParticleSystemsCount) {
            this._lastParticleSystemsCount = scene.particleSystems.length;
            this.createPlanes(this.particleSystemsPlanes, this.particleSystemsMaterial, this._lastParticleSystemsCount);
        }
    }

    /**
     * On post update the scenes
     */
    public onPostUpdate (): void {
        const scene = this.editor.core.scene;

        // Render helpers scene
        this.scene.activeCamera = this.editor.core.scene.activeCamera;
        this.scene.render();

        // Cameras
        scene.cameras.forEach((c, index) => {
            const plane = this.camerasPlanes[index];
            plane.metadata.object = c;

            if (c === scene.activeCamera || !c.position)
                return plane.setEnabled(false);

            plane.setEnabled(true);
            this.configurePlane(plane, c.position);
        });

        // Lights
        scene.lights.forEach((l, index) => {
            const plane = this.lightsPlanes[index];
            plane.metadata.object = l;

            this.configurePlane(plane, l.getAbsolutePosition());
        });

        // Particle Systems
        scene.particleSystems.forEach((ps, index) => {
            const plane = this.particleSystemsPlanes[index];
            plane.metadata.object = ps;

            if (ps.emitter instanceof Vector3)
                this.configurePlane(plane, ps.emitter);
            else if (ps.emitter)
                this.configurePlane(plane, ps.emitter.getAbsolutePosition());
        });
    }

    /**
     * Launch a ray to try to pick a mesh in the icons scene
     * @param offsetX the x position of the mouse
     * @param offsetY the y position of the mouse
     * @param getSourceObject if the pick result should set the picked mesh as the source plane mesh
     */
    public pickIcon (offsetX: number, offsetY: number, getSourceObject: boolean = true): PickingInfo {
        const pick = this.scene.pick(offsetX, offsetY);
        if (!pick.hit)
            return null;

        if (getSourceObject)
            pick.pickedMesh = pick.pickedMesh.metadata.object;

        return pick;
    }

    /**
     * Creates all the (count) planes and applies the given material
     * @param planes the array containing the existing planes
     * @param material the material to apply to the new planes
     * @param count number of planes to create
     */
    protected createPlanes (planes: Mesh[], material: StandardMaterial, count: number): void {
        planes.forEach(p => p.dispose());
        planes.splice(0, planes.length);

        for (let i = 0; i < count; i++) {
            const plane = Mesh.CreatePlane('SceneIconsPlane', 1, this.scene, false);
            plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
            plane.material = material;
            plane.isPickable = true;
            plane.metadata = {
                object: null
            };

            planes.push(plane);
        }
    }

    /**
     * Configures the given plane according to the given source object position
     * @param plane: the plane to configure to draw in the helper's scene
     * @param sourcePosition: the position of the object to draw the helper in the scene
     */
    protected configurePlane (plane: Mesh, sourcePosition: Vector3): void {
        const distance = Vector3.Distance(this.editor.core.scene.activeCamera.position, sourcePosition) * 0.05;
        plane.scaling = new Vector3(distance, distance, distance);
        plane.position.copyFrom(sourcePosition);
        plane.computeWorldMatrix(true);
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
