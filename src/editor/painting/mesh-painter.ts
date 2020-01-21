import {
    Mesh, Tags, Observer, PointerInfo, StandardMaterial, PointerEventTypes,
    Vector3, Scalar, PickingInfo, AbstractMesh, KeyboardEventTypes, Space, Quaternion
} from 'babylonjs';

import Editor from '../editor';
import { IPaintingTool } from "./painting-tools";
import AssetPicker from '../components/asset-picker';
import AbstractEditionTool from '../edition-tools/edition-tool';
import { Prefab } from '../prefabs/prefab';

import { AssetElement } from '../../extensions/typings/asset';
import Picker from '../gui/picker';

export default class MeshPainter extends AbstractEditionTool<MeshPainter> implements IPaintingTool {
    /**
     * Defines the id of the tool in the inspector.
     */
    public divId: string = 'MESH-PAINTER-TOOL';
    /**
     * Defines the name of the tab in the inspector.
     */
    public tabName: string = 'Mesh Painter';
    /**
     * Gets wether or not the tool is enabled.
     */
    public enabled: boolean = false;

    private _sphere: Mesh;
    private _material: StandardMaterial;
    private _pointerObserver: Observer<any> = null;
    private _pointerOutObserver: Observer<any> = null;

    private _painting: boolean = false;
    private _removing: boolean = false;
    private _paintDistance: number = 10;
    private _rotationRandomizer: Vector3 = new Vector3(0, 1, 0);
    private _scalingRandomizer: number = 1.0;
    private _paintedMeshes: AbstractMesh[] = [];

    private _sourceAssets: AssetElement<Prefab>[] = [];
    private _targetSurfaces: AbstractMesh[] = [];

    private _applyOrientation: boolean = false;
    private _yawCor: number = 0;
    private _pitchCor: number = 0;
    private _rollCor: number = 0;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    constructor (public editor: Editor) {
        super();

        // Register tool
        editor.inspector.addTool(this);

        // Create sphere.
        this._sphere = Mesh.CreateSphere('MeshPainterSphere', 32, 1, editor.core.scene, false);
        this._sphere.doNotSerialize = true;
        this._sphere.isPickable = false;
        Tags.AddTagsTo(this._sphere, 'graph-hidden');

        // Create material
        this._material = new StandardMaterial('MeshPainterMaterial', editor.core.scene);
        this._material.disableLighting = true;
        this._material.alpha = 0.3;
        this._sphere.material = this._material;
        editor.core.scene.materials.pop();

        // Observers
        editor.core.scene.onKeyboardObservable.add((info) => {
            if (info.type === KeyboardEventTypes.KEYUP && info.event.keyCode === 27) {
                this.setEnabled(false);
                editor.preview.disableToolMode('mesh-painter');
            }
        });
        editor.core.onSelectObject.add((_) => {
            this.setEnabled(false);
            editor.preview.disableToolMode('mesh-painter');
        });
    }

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof MeshPainter;
    }

    /**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(_: MeshPainter): void {
        super.update(_);

        // Scale
        this.tool.add(this._sphere.scaling, 'x').name('Scale').min(0).onChange((r) => {
            this._sphere.scaling.y = this._sphere.scaling.z = r;
        });

        // Options
        this.tool.add(this, '_paintDistance').step(0.1).name('Painting Distance');
        this.tool.addVector(this.tool.element, 'Rotation Randomizer', this._rotationRandomizer, () => {
            this._rotationRandomizer.x = Scalar.Clamp(this._rotationRandomizer.x, 0, 1);
            this._rotationRandomizer.y = Scalar.Clamp(this._rotationRandomizer.y, 0, 1);
            this._rotationRandomizer.z = Scalar.Clamp(this._rotationRandomizer.z, 0, 1);
        }).open();
        this.tool.add(this, '_scalingRandomizer').name('Scaling Randomizer');

        const orientation = this.tool.addFolder('Orientation');
        orientation.open();

        orientation.add(this, '_applyOrientation').name('Apply Orientation');
        orientation.add(this, '_yawCor').step(0.01).name('Yaw Cor');
        orientation.add(this, '_pitchCor').step(0.01).name('Pitch Cor');
        orientation.add(this, '_rollCor').step(0.01).name('Roll Cor');
        
        // Sources
        const sources = this.tool.addFolder('Sources');
        sources.open();
        
        sources.add(this, '_addPrefabSource').name('Add Prefab Source...');
        this._sourceAssets.forEach((a) => {
            const f = sources.addFolder(`${a.name}`);
            f.open();

            const o = { fn: () => this._removePrefabSource(a) };
            f.add(o, 'fn').name(`Remove "${a.name}"`);
            f.addImage(a.img);
        });
        
        // Targets
        const targets = this.tool.addFolder('Target Surfaces');
        targets.open();
        
        targets.add(this, '_addTargetSurface').name('Add Target Surface...');
        this._targetSurfaces.forEach((t) => {
            const o = { fn: () => this._removeTargetSurface(t) };
            targets.add(o, 'fn').name(`Remove "${t.name}"`);
        })
    }

    /**
     * Sets wether or not the tool is enabled.
     * @param enabled wether or not the tool is enabled.
     */
    public setEnabled (enabled: boolean): void {
        if (this.enabled === enabled)
            return;
        
        this.enabled = enabled;

        this._sphere.setEnabled(enabled);
        this.editor.scenePicker.enabled = !enabled;

        const scene = this.editor.core.scene;
        const engine = scene.getEngine();
        const canvas = engine.getRenderingCanvas();

        if (enabled) {
            scene.activeCamera.inputs.detachElement(canvas, false);
            this._pointerObserver = scene.onPointerObservable.add((info) => this._pointerMove(info));
            this._pointerOutObserver = engine.onCanvasPointerOutObservable.add(() => this._canvasPointerOut());

            this._refreshPaintedMeshes();
            this.editor.inspector.setObject(this);
        } else {
            scene.activeCamera.inputs.attachElement(canvas, true);
            scene.onPointerObservable.remove(this._pointerObserver);
            engine.onCanvasBlurObservable.remove(this._pointerOutObserver);

            this._painting = false;
        }
    }

    // Called on the canvas is blurred.
    private _canvasPointerOut (): void {
        // Not painting anymore
        this._painting = false;

        const engine = this.editor.core.engine;
        const pick = this.editor.core.scene.pick(
            engine.getRenderWidth()  * 0.5,
            engine.getRenderHeight() * 0.5
        );

        if (!pick.pickedMesh)
            return;

        this._sphere.position.copyFrom(pick.pickedPoint);
    }

    // Called on a pointer event is triggered on the canvas.
    private _pointerMove (info: PointerInfo): void {
        // Just wheel?
        if (info.type === PointerEventTypes.POINTERWHEEL) {
            const newScale = Math.max(0.0, this._sphere.scaling.x - ((<WheelEvent> info.event).deltaY) / (info.event.ctrlKey ? 100 : 10));
            this._sphere.scaling.set(newScale, newScale, newScale);
            this.tool.updateDisplay();
            return;
        }

        // Test if possible first.
        if (!this._sourceAssets.length)
            return;

        // Pick!
        const pick = this.editor.core.scene.pick(
            this.editor.core.scene.pointerX,
            this.editor.core.scene.pointerY
        );

        if (!pick.pickedMesh || (this._targetSurfaces.length && this._targetSurfaces.indexOf(pick.pickedMesh) === -1))
            return;

        this._sphere.position.copyFrom(pick.pickedPoint);

        // Event type
        switch (info.type) {
            case PointerEventTypes.POINTERDOWN:
                if (info.event.button === 0)
                    this._painting = true;
                else if (info.event.button === 2)
                    this._removing = true;
                break;
            case PointerEventTypes.POINTERUP:
                this._painting = false;
                this._removing = false;
                break;
        }

        // Paint!
        if (this._painting)
            this._paint(info, pick);

        // Remove!
        if (this._removing)
            this._remove(info, pick);
    }

    // Refreshes the number of painted meshes.
    private _refreshPaintedMeshes (): void {
        this._paintedMeshes = this.editor.core.scene.meshes.filter((m) => {
            if (!m.metadata || !m.metadata.painting)
                return null;

            const found = this._sourceAssets.find((a) => a.name === m.metadata.painting.sourceName);
            if (found) {
                m.isPickable = false;
                return found;
            }

            return null;
        });
    }

    // On the user wants to add a prefab source.
    private async _addPrefabSource (): Promise<void> {
        const asset = await AssetPicker.Show<Prefab>(this.editor, this.editor.assets.prefabs);
        const index = this._sourceAssets.indexOf(asset);
        if (index !== -1)
            return;
        
        this._sourceAssets.push(asset);

        this._refreshPaintedMeshes();
        this.update(this);
    }

    // On the user wants to add a target surface.
    private async _addTargetSurface (): Promise<void> {
        const meshes = this.editor.core.scene.meshes.filter((m) => m !== this._sphere && this._targetSurfaces.indexOf(m) === -1);

        const picker = new Picker('Add Target Surface');
        picker.addItems(meshes);
        picker.open((items) => {
            items.forEach((i) => this._targetSurfaces.push(meshes[i.id]));
            this.update(this);
        });
    }

    // On the user wants to remove a prefab source.
    private _removePrefabSource (source: AssetElement<Prefab>): void {
        const index = this._sourceAssets.indexOf(source);
        if (index !== -1)
            this._sourceAssets.splice(index, 1);

        this._refreshPaintedMeshes();
        this.update(this);
    }

    // On the user wants to remove a target.
    private _removeTargetSurface (target: AbstractMesh): void {
        const index = this._targetSurfaces.indexOf(target);
        if (index !== -1)
            this._targetSurfaces.splice(index, 1);

        this.update(this);
    }

    // Remove sources!
    private _remove (info: PointerInfo, pickInfo: PickingInfo): void {
        const toRemove = this._paintedMeshes.filter((pm) => Vector3.Distance(pm.position, this._sphere.position) <= this._sphere.scaling.x * 0.5);
        toRemove.forEach((tr) => tr.dispose(false));
    }

    // Paint sources!
    private _paint (info: PointerInfo, pickInfo: PickingInfo): void {
        const asset = this._sourceAssets[(Math.random() * this._sourceAssets.length) >> 0];
        const nearMesh = this._paintedMeshes.find((m) => Vector3.Distance(m.absolutePosition, pickInfo.pickedPoint) < this._paintDistance);
        if (nearMesh)
            return;

        const prefab = <AbstractMesh> this.editor.assets.prefabs.instantiatePrefab(asset, pickInfo);
        prefab.isPickable = false;
        prefab.metadata = prefab.metadata || { };
        prefab.metadata.painting = {
            sourceName: asset.name
        };
        
        if (this._applyOrientation)
            prefab.lookAt(pickInfo.getNormal(true, true), this._yawCor, this._pitchCor, this._rollCor, Space.LOCAL);
        
        prefab.position.set(
            pickInfo.pickedPoint.x + this._getRandom(this._sphere.scaling.x),
            pickInfo.pickedPoint.y,
            pickInfo.pickedPoint.z + this._getRandom(this._sphere.scaling.x)
        );
        
        if (prefab.rotationQuaternion) {
            prefab.rotationQuaternion.multiplyInPlace(Quaternion.FromEulerAngles(
                2 * Math.PI * Math.random() * this._rotationRandomizer.x,
                2 * Math.PI * Math.random() * this._rotationRandomizer.y,
                2 * Math.PI * Math.random() * this._rotationRandomizer.z,
            ));
        } else {
            prefab.rotation.addInPlace(new Vector3(
                2 * Math.PI * Math.random() * this._rotationRandomizer.x,
                2 * Math.PI * Math.random() * this._rotationRandomizer.y,
                2 * Math.PI * Math.random() * this._rotationRandomizer.z,
            ));
        }

        prefab.scaling.addInPlace(new Vector3(
            Math.random() * this._scalingRandomizer,
            Math.random() * this._scalingRandomizer,
            Math.random() * this._scalingRandomizer,
        ));

        this._paintedMeshes.push(prefab);
    }

    // Returns a random number in [-range, range].
    private _getRandom (range: number): number {
        const min = -range * 0.5;
        const max = range * 0.5;

        return Math.random() * (max - min) + min;
    }
}
