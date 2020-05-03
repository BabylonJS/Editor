import { Nullable } from "../../../shared/types";

import {
    Mesh, UtilityLayerRenderer, Observer, Scene, StandardMaterial, Texture, Vector3,
    Observable, PointerEventTypes, Vector2, AbstractMesh,
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

    private _lightMaterial: StandardMaterial;
    private _cameraMaterial: StandardMaterial;
    private _particleMaterial: StandardMaterial;

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

        // Materials
        this._lightMaterial = new StandardMaterial("cameraMaterial", this._layer.utilityLayerScene);
        this._lightMaterial.disableLighting = true;
        this._lightMaterial.useAlphaFromDiffuseTexture = true;
        this._lightMaterial.diffuseTexture = new Texture("../assets/textures/lightbulb.png", this._layer.utilityLayerScene);
        this._lightMaterial.diffuseTexture.hasAlpha = true;

        this._cameraMaterial = new StandardMaterial("cameraMaterial", this._layer.utilityLayerScene);
        this._cameraMaterial.disableLighting = true;
        this._cameraMaterial.useAlphaFromDiffuseTexture = true;
        this._cameraMaterial.diffuseTexture = new Texture("../assets/textures/camera.png", this._layer.utilityLayerScene);
        this._cameraMaterial.diffuseTexture.hasAlpha = true;

        this._particleMaterial = new StandardMaterial("particleMaterial", this._layer.utilityLayerScene);
        this._particleMaterial.disableLighting = true;
        this._particleMaterial.useAlphaFromDiffuseTexture = true;
        this._particleMaterial.diffuseTexture = new Texture("../assets/textures/wind.png", this._layer.utilityLayerScene);
        this._particleMaterial.diffuseTexture.hasAlpha = true;

        // Register
        this._onBeforeRenderObserver = this._layer.utilityLayerScene.onBeforeRenderObservable.add(() => {
            this.refresh();
        });
        this._layer.utilityLayerScene.onPointerObservable.add((info) => {
            switch (info.type) {
                case PointerEventTypes.POINTERDOWN: this._onPointerDown(info.event); break;
                case PointerEventTypes.POINTERUP: this._onPointerUp(info.event); break;
            }
        })
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
            const distance = Vector3.Distance(emitter.getAbsolutePosition(), this._editor.scene!.activeCamera!.position) * 0.05;

            plane.position.copyFrom(emitter.getAbsolutePosition());
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
    private _onPointerDown(ev: MouseEvent): void {
        this._downMousePosition.set(ev.offsetX, ev.offsetY);
    }

    /**
     * Called on the pointer is up on the canvas.
     */
    private _onPointerUp(ev: MouseEvent): void {
        const distance = Vector2.Distance(this._downMousePosition, new Vector2(ev.offsetX, ev.offsetY));
        if (distance > 2) { return; }

        this.onClickObservable.notifyObservers(ev);
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