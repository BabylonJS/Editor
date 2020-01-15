import {
    GroundMesh, Mesh, StandardMaterial, VertexBuffer,
    Tags, KeyboardEventTypes, Observer,
    PointerInfo, PointerEventTypes, PickingInfo,
    Vector3, FloatArray, IndicesArray, SubMesh, BoundingInfo, BoundingBox,
} from 'babylonjs';

import Editor from '../editor';
import { IPaintingTool } from "./painting-tools";
import AbstractEditionTool from '../edition-tools/edition-tool';

export default class TerrainPainter extends AbstractEditionTool<TerrainPainter> implements IPaintingTool {
    /**
     * Defines the id of the tool in the inspector.
     */
    public divId: string = 'TERRAIN-PAINTER-TOOL';
    /**
     * Defines the name of the tab in the inspector.
     */
    public tabName: string = 'Terrain Painter';
    /**
     * Gets wether or not the tool is enabled.
     */
    public enabled: boolean = false;

    private _sphere: Mesh;
    private _material: StandardMaterial;
    private _pointerObserver: Observer<any> = null;
    private _pointerOutObserver: Observer<any> = null;

    private _elevating: boolean = false;
    private _removing: boolean = false;

    private _currentGround: GroundMesh = null;

    private _positions: Vector3[] = [];
    private _positionsData: FloatArray = null;

    private _normals: Vector3[] = [];
    private _normalsData: FloatArray = null;

    private _indices: IndicesArray = null;

    private _facesOfVertices: number[][] = [];
    private _subdivisionsOfVertices: SubMesh[][] = [];
    private _selectedVertices: number[] = [];

    private _speed: number = 0.01;
    private _minHeight: number = -1000;
    private _maxHeight: number = 1000;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    constructor (public editor: Editor) {
        super();

        // Register tool
        editor.inspector.addTool(this);

        // Create sphere.
        this._sphere = Mesh.CreateSphere('TerrainPainterSphere', 32, 1, editor.core.scene, false);
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
                editor.preview.disableToolMode('terrain-painter');
            }
        });
        editor.core.onSelectObject.add((_) => {
            this.setEnabled(false);
            editor.preview.disableToolMode('terrain-painter');
        });
    }

    /**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof TerrainPainter;
    }

    /**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(_: TerrainPainter): void {
        super.update(_);

        // Scale
        this.tool.add(this._sphere.scaling, 'x').name('Scale').onChange((r) => {
            this._sphere.scaling.y = this._sphere.scaling.z = r;
        });

        // Options
        this.tool.add(this, '_speed').min(0.01).step(0.01).name('Speed');
        this.tool.add(this, '_minHeight').min(0.01).step(0.01).name('Min Height');
        this.tool.add(this, '_maxHeight').min(0.01).step(0.01).name('Max Height');
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

            this.editor.inspector.setObject(this);
        } else {
            scene.activeCamera.inputs.attachElement(canvas, true);
            scene.onPointerObservable.remove(this._pointerObserver);
            engine.onCanvasBlurObservable.remove(this._pointerOutObserver);

            this._elevating = false;
            this._currentGround = null;
        }
    }

    // Called on the canvas is blurred.
    private _canvasPointerOut (): void {
        // Not painting anymore
        this._elevating = false;

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

        // Pick!
        const pick = this.editor.core.scene.pick(
            this.editor.core.scene.pointerX,
            this.editor.core.scene.pointerY
        );

        if (!pick.pickedMesh || !(pick.pickedMesh instanceof GroundMesh))
            return;

        this._sphere.position.copyFrom(pick.pickedPoint);

        // Event type
        switch (info.type) {
            case PointerEventTypes.POINTERDOWN:
                if (info.event.button === 0)
                    this._elevating = true;
                else if (info.event.button === 2)
                    this._removing = true;
                break;
            case PointerEventTypes.POINTERUP:
                this._elevating = false;
                this._removing = false;
                break;
        }

        // Paint!
        if (this._elevating)
            this._elevate(pick.pickedMesh, info, pick);

        // Remove!
        if (this._removing)
            this._remove(pick.pickedMesh, info, pick);
    }

    // Add elevation!
    private _elevate (mesh: GroundMesh, info: PointerInfo, pickInfo: PickingInfo): void {
        this._updateData(mesh);
        this._filterVertices(mesh, pickInfo);
        this._applyElevation(1.0 * (info.event.ctrlKey ? 0.5 : 1.0));
    }

    // Remove elevation!
    private _remove (mesh: GroundMesh, info: PointerInfo, pickInfo: PickingInfo): void {
        this._updateData(mesh);
        this._filterVertices(mesh, pickInfo);
        this._applyElevation(-1.0 * (info.event.ctrlKey ? 0.5 : 1.0));
    }

    private _applyElevation (invertDirection: number): void {
        this._selectedVertices.forEach((_, selectedVertice) => {
            const position = this._positions[selectedVertice];
            const distance = this._selectedVertices[selectedVertice];

            const fullHeight = this._sphere.scaling.x * 0.5 * this._speed * invertDirection;
            if (distance < this._sphere.scaling.x * 0.5 * 0.1) {
                position.y += fullHeight;
            } else {
                position.y += fullHeight * (1.0 - (distance - this._sphere.scaling.x * 0.5 * 0.3) / (this._sphere.scaling.x * 0.5 * 0.7));
            }

            if (position.y < this._minHeight)
                position.y = this._minHeight;
            if (position.y > this._maxHeight)
                position.y = this._maxHeight;

            this._positionsData[selectedVertice * 3 + 1] = position.y;
            this._updateSubdivisions(selectedVertice);
        });

        this._reComputeNormals();

        this._currentGround.updateVerticesData(VertexBuffer.PositionKind, this._positionsData);
        this._currentGround.updateVerticesData(VertexBuffer.NormalKind,this._normalsData);    
    }

    private _updateData (mesh: GroundMesh): void {
        if (this._currentGround === mesh)
            return;
        
        this._currentGround = mesh;

        this._positionsData = mesh.getVerticesData(VertexBuffer.PositionKind);
        this._normalsData = mesh.getVerticesData(VertexBuffer.NormalKind);
        this._indices = mesh.getIndices();

        this._positions = [];
        for (let i = 0; i < this._positionsData.length; i += 3)
            this._positions.push(new Vector3(this._positionsData[i], this._positionsData[i + 1], this._positionsData[i + 2]));

        this._normals = [];
        for (let i = 0; i < mesh.getTotalIndices() / 3; i++) {
            this._computeFaceNormal(i);
        }

        this._getFacesOfVertices();
    }

    private _filterVertices (mesh: GroundMesh, pickInfo: PickingInfo): void {
        this._selectedVertices = [];

        const sphereCenter = pickInfo.pickedPoint.clone();
        sphereCenter.y = mesh.position.y;

        const localPosition = pickInfo.pickedPoint.subtract(mesh.getAbsolutePosition());

        for (let subIndex = 0; subIndex < mesh.subMeshes.length; subIndex++) {
            const subMesh = mesh.subMeshes[subIndex];

            if (!this._isBoxSphereIntersected(subMesh.getBoundingInfo().boundingBox, sphereCenter))
                continue;

            for (let i = subMesh.verticesStart; i < subMesh.verticesStart + subMesh.verticesCount; i++) {
                const position = this._positions[i];
                localPosition.y = position.y;

                const distance = Vector3.Distance(position, localPosition);

                if (distance < this._sphere.scaling.x * 0.5) {
                    this._selectedVertices[i] = distance;
                }
            }
        }
    }

    private _isBoxSphereIntersected (box: BoundingBox, sphereCenter: Vector3): boolean {
        const vector = Vector3.Clamp(sphereCenter, box.minimumWorld, box.maximumWorld);
        var num = Vector3.DistanceSquared(sphereCenter, vector);
        return (num <= (this._sphere.scaling.x * 0.5 * this._sphere.scaling.x * 0.5));
    }

    private _computeFaceNormal (face: number): void {
        const faceInfo = this._getFaceVerticesIndex(face);

        const v1v2 = this._positions[faceInfo.v1].subtract(this._positions[faceInfo.v2]);
        const v3v2 = this._positions[faceInfo.v3].subtract(this._positions[faceInfo.v2]);

        this._normals[face] = Vector3.Normalize(Vector3.Cross(v1v2, v3v2));
    }

    private _getFaceVerticesIndex (faceID: number): any {
        return {
            v1: this._indices[faceID * 3],
            v2: this._indices[faceID * 3 + 1],
            v3: this._indices[faceID * 3 + 2]
        };
    }

    private _getFacesOfVertices (): void {
        this._facesOfVertices = [];
        this._subdivisionsOfVertices = [];

        for (let i = 0; i < this._positions.length; i++) {
            this._facesOfVertices[i] = [];
            this._subdivisionsOfVertices[i] = [];
        }

        for (let i = 0; i < this._indices.length; i++)
            this._facesOfVertices[this._indices[i]].push((i / 3) | 0);

        for (let subIndex = 0; subIndex < this._currentGround.subMeshes.length; subIndex++) {
            const subMesh = this._currentGround.subMeshes[subIndex];
            for (let i = subMesh.verticesStart; i < subMesh.verticesStart + subMesh.verticesCount; i++)
                this._subdivisionsOfVertices[i].push(subMesh);
        }
    }

    private _updateSubdivisions (vertexIndex: number): void {
        for (let i = 0; i < this._subdivisionsOfVertices[vertexIndex].length; i++) {
            const sub = this._subdivisionsOfVertices[vertexIndex][i];
            const boundingBox = sub.getBoundingInfo().boundingBox;
            const boundingSphere = sub.getBoundingInfo().boundingSphere;

            if (this._positions[vertexIndex].y < boundingBox.minimum.y) {
                boundingSphere.radius += Math.abs(this._positions[vertexIndex].y - boundingBox.minimum.y);
                boundingBox.minimum.y = this._positions[vertexIndex].y;
            }
            else if (this._positions[vertexIndex].y > boundingBox.maximum.y) {
                boundingBox.maximum.y = this._positions[vertexIndex].y;
            }
        }

        const boundingBox = this._currentGround.getBoundingInfo().boundingBox;
        const boundingSphere = this._currentGround.getBoundingInfo().boundingSphere;
        if (this._positions[vertexIndex].y < boundingBox.minimum.y) {
            boundingSphere.radius += Math.abs(this._positions[vertexIndex].y - boundingBox.minimum.y);
            boundingBox.minimum.y = this._positions[vertexIndex].y;
        }
        else if (this._positions[vertexIndex].y > boundingBox.maximum.y) {
            boundingBox.maximum.y = this._positions[vertexIndex].y;
        }
    }

    private _reComputeNormals (): void {
        const faces = [];

        for (let selectedVertice in this._selectedVertices) {
            const faceOfVertices = this._facesOfVertices[selectedVertice];
            for (let i = 0; i < faceOfVertices.length; i++)
                faces[faceOfVertices[i]] = true;
        }

        faces.forEach((_, face) => {
            this._computeFaceNormal(face);
        });

        faces.forEach((_, face) => {
            var faceInfo = this._getFaceVerticesIndex(face);
            this._computeNormal(faceInfo.v1);
            this._computeNormal(faceInfo.v2);
            this._computeNormal(faceInfo.v3);
        });
    }

    private _computeNormal (vertexIndex: number): void {
        const faces = this._facesOfVertices[vertexIndex];

        let normal = Vector3.Zero();
        for (let i = 0; i < faces.length; i++) {
            normal = normal.add(this._normals[faces[i]]);
        }

        normal = Vector3.Normalize(normal.scale(1.0 / faces.length));

        this._normalsData[vertexIndex * 3] = normal.x;
        this._normalsData[vertexIndex * 3 + 1] = normal.y;
        this._normalsData[vertexIndex * 3 + 2] = normal.z;
    }
}
