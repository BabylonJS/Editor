import { Nullable } from "../../../shared/types";

import {
    Mesh, UtilityLayerRenderer, Observer, Scene, StandardMaterial, Texture, Vector3,
    Observable, PointerEventTypes, Vector2, AbstractMesh, ParticleSystem, IMouseEvent,
} from "babylonjs";

import { Editor } from "../editor";

export class SceneIcons {
    /**
     * Notifies the obersers that an icon has been clicked.
     */
    public onClickObservable: Observable<MouseEvent> = new Observable<MouseEvent>();
    
    /**
     * @hidden
     */
    public _layer: UtilityLayerRenderer;

    private _editor: Editor;

    private _onBeforeRenderObserver: Nullable<Observer<Scene>>;

    private _lights: Mesh[] = [];
    private _cameras: Mesh[] = [];
    private _particleSystems: Mesh[] = [];
    private _sounds: Mesh[] = [];

    private _lightMaterial: StandardMaterial;
    private _cameraMaterial: StandardMaterial;
    private _particleMaterial: StandardMaterial;
    private _soundOnMaterial: StandardMaterial;
    private _soundOffMaterial: StandardMaterial;

    private _downMousePosition: Vector2 = Vector2.Zero();

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;

        // Create layer
        this._layer = new UtilityLayerRenderer(editor.scene!);
        this._layer.utilityLayerScene.postProcessesEnabled = false;
        this._layer.utilityLayerScene.autoClear = false;

        // Materials
        this._lightMaterial = this._getIconMaterial("lightMaterial", "../assets/textures/lightbulb.png");
        this._cameraMaterial = this._getIconMaterial("cameraMaterial", "../assets/textures/camera.png");
        this._particleMaterial = this._getIconMaterial("particleMaterial", "../assets/textures/wind.png");

        this._soundOnMaterial = this._getIconMaterial("soundOnMaterial", "../assets/textures/volume-up.png");
        this._soundOffMaterial = this._getIconMaterial("soundOffMaterial", "../assets/textures/volume-mute.png");

        // Register
        this._onBeforeRenderObserver = this._layer.utilityLayerScene.onBeforeRenderObservable.add(() => {
            this.refresh();
        });

        this._layer.utilityLayerScene.onPointerObservable.add((info) => {
            switch (info.type) {
                case PointerEventTypes.POINTERDOWN: this._onPointerDown(info.event); break;
                case PointerEventTypes.POINTERUP: this._onPointerUp(info.event); break;
            }
        });
    }
 
    private _getIconMaterial(name: string, textureUrl: string): StandardMaterial {
        const m = new StandardMaterial(name, this._layer.utilityLayerScene);
        m.disableLighting = true;
        m.useAlphaFromDiffuseTexture = true;
        m.diffuseTexture = new Texture(textureUrl, this._layer.utilityLayerScene);
        m.diffuseTexture.hasAlpha = true;

        return m;
    }

    /**
     * Gets wether or not the icons should be rendered.
     */
    public get enabled(): boolean {
        return this._layer.shouldRender;
    }

    /**
     * Sets wether or not the icons should be rendered.
     */
    public set enabled(enabled: boolean) {
        this._layer.shouldRender = enabled;
    }

    /**
     * Refreshes the scene icons.
     */
    public refresh(): void {
        if (!this._editor.scene!.activeCamera) { return; }

        // Lights
        if (this._lights.length !== this._editor.scene!.lights.length) {
            this._lights.forEach((c) => c.dispose());
            this._lights = [];
            
            this._editor.scene!.lights.forEach((l) => {
                const plane = this._createPlane(l.name);
                plane.material = this._lightMaterial;
                plane.metadata = { node: l };
                this._lights.push(plane);
            });
        }
        
        this._editor.scene!.lights.forEach((l, index) => {
            const plane = this._lights[index];
            if (!plane) { return; }

            const distance = Vector3.Distance(l.getAbsolutePosition(), this._editor.scene!.activeCamera!.globalPosition) * 0.04;
            
            plane.position.copyFrom(l.getAbsolutePosition());
            plane.scaling.set(distance, distance * 1.5, distance);
        });
        
        // Cameras
        if (this._cameras.length !== this._editor.scene!.cameras.length) {
            this._cameras.forEach((c) => c.dispose());
            this._cameras = [];
            
            this._editor.scene!.cameras.forEach((c) => {
                const plane = this._createPlane(c.name);
                plane.material = this._cameraMaterial;
                plane.metadata = { node: c };
                this._cameras.push(plane);
            });
        }

        this._editor.scene!.cameras.forEach((c, index) => {
            const plane = this._cameras[index];
            if (!plane) { return; }

            c.computeWorldMatrix();
            const distance = Vector3.Distance(c.globalPosition, this._editor.scene!.activeCamera!.position) * 0.05;

            plane.position.copyFrom(c.globalPosition);
            plane.scaling.set(distance, distance, distance);
        });

        // Particle systems
        if (this._particleSystems.length !== this._editor.scene!.particleSystems.length) {
            this._particleSystems.forEach((ps) => ps.dispose());
            this._particleSystems = [];
            
            this._editor.scene!.particleSystems.forEach((ps) => {
                const plane = this._createPlane(ps.name);
                plane.material = this._particleMaterial;
                plane.metadata = { node: ps };
                this._particleSystems.push(plane);
            });
        }

        this._editor.scene!.particleSystems.forEach((ps, index) => {
            const plane = this._particleSystems[index];
            if (!plane) { return; }

            const emitter = ps.emitter as AbstractMesh;
            const emitterPosition = emitter.getAbsolutePosition();
            const distance = Vector3.Distance(emitterPosition, this._editor.scene!.activeCamera!.position) * 0.05;

            if (ps instanceof ParticleSystem) {
                plane.position.copyFrom(emitterPosition.add(ps.worldOffset));
            }

            plane.scaling.set(distance, distance, distance);
        });

        // Sounds
        const sounds = this._editor.scene!.mainSoundTrack.soundCollection.filter((s) => s.spatialSound);
        if (this._sounds.length !== sounds.length) {
            this._sounds.forEach((s) => s.dispose());
            this._sounds = [];
            
            sounds.forEach((s) => {
                const plane = this._createPlane(s.name);
                plane.material = this._soundOnMaterial;
                plane.metadata = { node: s };
                this._sounds.push(plane);
            });
        }

        sounds.forEach((s, index) => {
            const plane = this._sounds[index];
            if (!plane) { return; }

            const attachedNode = s["_connectedTransformNode"];
            if (!attachedNode) { return; }

            plane.material = s.isPlaying ? this._soundOnMaterial : this._soundOffMaterial;

            const soundPosition = attachedNode.getAbsolutePosition();
            const distance = Vector3.Distance(soundPosition, this._editor.scene!.activeCamera!.position) * 0.05;

            plane.position.copyFrom(soundPosition);
            plane.scaling.set(distance, distance, distance);
        });
    }

    /**
     * Disposes the scene icons.
     */
    public dispose(): void {
        if (this._onBeforeRenderObserver) {
            this._layer.utilityLayerScene.onBeforeRenderObservable.remove(this._onBeforeRenderObserver);
        }

        this._lights.forEach((l) => l.dispose());
        this._cameras.forEach((c) => c.dispose());
    }

    /**
     * Called on the pointer is down on the canvas.
     */
    private _onPointerDown(ev: IMouseEvent): void {
        this._downMousePosition.set(ev.offsetX, ev.offsetY);
    }

    /**
     * Called on the pointer is up on the canvas.
     */
    private _onPointerUp(ev: IMouseEvent): void {
        const distance = Vector2.Distance(this._downMousePosition, new Vector2(ev.offsetX, ev.offsetY));
        if (distance > 2) { return; }

        this.onClickObservable.notifyObservers(ev as any);
    }

    /**
     * Creates a new plane.
     */
    private _createPlane(name: string): Mesh {
        const plane = Mesh.CreatePlane(name, 1, this._layer.utilityLayerScene, false);
        plane.isPickable = true;
        plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

        return plane;
    }
}