import { readJSON } from "fs-extra";
import { extname } from "path/posix";

import { Component, DragEvent, ReactNode } from "react";

import { MdOutlineQuestionMark } from "react-icons/md";

import { AbstractMesh, Mesh, Material, MeshBuilder, Vector2, Vector3, Tools } from "babylonjs";

import { Editor } from "../../../main";

import { UniqueNumber, waitNextAnimationFrame } from "../../../../tools/tools";
import { setMeshMetadataNotSerializable } from "../../../../tools/mesh/metadata";

import { loadImportedMaterial } from "../../preview/import/import";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { decalsConfiguration } from "./configuration";

export interface IEditorDecalsInspectorProps {
    editor: Editor;
}

export interface IEditorDecalsInspectorState {
    assetDragOver: boolean;
    material: Material | null;

    ctrlOrMetaKeyDown: boolean;
}

export class EditorDecalsInspector extends Component<IEditorDecalsInspectorProps, IEditorDecalsInspectorState> {
    private _mouseMoveListener: ((event: MouseEvent) => void) | null = null;
    private _mouseDownListener: ((event: MouseEvent) => void) | null = null;
    private _mouseUpListener: ((event: MouseEvent) => void) | null = null;

    private _keyDownListener: ((event: KeyboardEvent) => void) | null = null;
    private _keyUpListener: ((event: KeyboardEvent) => void) | null = null;

    private _decalMesh: Mesh | null = null;
    private _mouseDownPosition: Vector2 = Vector2.Zero();

    private static _lastPickPosition: Vector3 | null = null;
    private static _lastPickedNormal: Vector3 | null = null;
    private static _lastPickedMesh: AbstractMesh | null = null;

    public constructor(props: IEditorDecalsInspectorProps) {
        super(props);

        this.state = {
            assetDragOver: false,
            material: null,

            ctrlOrMetaKeyDown: false,
        };
    }

    public render(): ReactNode {
        if (!this.props.editor.state.enableExperimentalFeatures) {
            return (
                <div className="text-xl font-semibold text-center w-full">
                    Coming soon...
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 w-full h-full">
                {this._getMaterialDragAndDropComponent()}

                <EditorInspectorSectionField title="Options">
                    <EditorInspectorNumberField object={decalsConfiguration.size} property="x" step={1} label="Width" onChange={() => this._handleUpdateCurrentDecalMesh()} />
                    <EditorInspectorNumberField object={decalsConfiguration.size} property="y" step={1} label="Height" onChange={() => this._handleUpdateCurrentDecalMesh()} />

                    <EditorInspectorNumberField object={decalsConfiguration} property="angle" asDegrees step={0.1} label="Angle" onChange={() => this._handleUpdateCurrentDecalMesh()} />
                </EditorInspectorSectionField>
            </div>
        );
    }

    public async componentDidMount(): Promise<void> {
        const canvas = this.props.editor.layout.preview.engine.getRenderingCanvas()!;

        canvas.addEventListener("mousemove", this._mouseMoveListener = (ev) => {
            this._handleMouseMove(ev.offsetX, ev.offsetY);
        });

        canvas.addEventListener("pointerdown", this._mouseDownListener = (ev) => {
            this._handleMouseDown(ev);
        });

        canvas.addEventListener("pointerup", this._mouseUpListener = (ev) => {
            this._handleMouseUp(ev);
        });

        document.addEventListener("keydown", this._keyDownListener = (ev) => {
            if (ev.ctrlKey || ev.metaKey) {
                this.setState({ ctrlOrMetaKeyDown: true });
            }
        });

        document.addEventListener("keyup", this._keyUpListener = (ev) => {
            if (!ev.ctrlKey && !ev.metaKey) {
                this.setState({ ctrlOrMetaKeyDown: false });
            }
        });

        this.props.editor.layout.preview.setState({ pickingEnabled: false });

        // Load existing material
        if (decalsConfiguration.materialPath) {
            await this._loadMaterialFromPath(decalsConfiguration.materialPath);
            await waitNextAnimationFrame();

            if (EditorDecalsInspector._lastPickedMesh?.isDisposed() === false) {
                this._handleUpdateCurrentDecalMesh();
            }
        }
    }

    public componentWillUnmount(): void {
        const canvas = this.props.editor.layout.preview.engine.getRenderingCanvas()!;

        canvas.removeEventListener("mousemove", this._mouseMoveListener!);
        canvas.removeEventListener("pointerdown", this._mouseDownListener!);
        canvas.removeEventListener("pointerup", this._mouseUpListener!);

        document.removeEventListener("keydown", this._keyDownListener!);
        document.removeEventListener("keyup", this._keyUpListener!);

        this.props.editor.layout.preview.setState({ pickingEnabled: true });

        this._disposeTemporaryDecalMesh();
    }

    public componentDidUpdate(): void {
        this._handleUpdateCurrentDecalMesh();
    }

    private _getMaterialDragAndDropComponent(): ReactNode {
        return (
            <div
                className={`
                    flex gap-2 w-full h-24 rounded-lg
                    ${this.state.assetDragOver ? "bg-secondary" : ""}
                    transition-all duration-300 ease-in-out
                `}
                onDragOver={(ev) => {
                    ev.preventDefault();
                    this.setState({ assetDragOver: true });
                }}
                onDrop={(ev) => this._handleAssetDropped(ev)}
                onDragLeave={() => this.setState({ assetDragOver: false })}
            >
                <div
                    className={`
                        flex justify-center items-center w-24 h-24 rounded-lg
                        ${decalsConfiguration.materialPath ? "" : "bg-accent"}
                    `}
                >
                    {!decalsConfiguration.materialPath &&
                        <MdOutlineQuestionMark className="w-8 h-8" />
                    }
                </div>

                <div className="flex flex-1 flex-col gap-2 justify-center items-center">
                    <div className="text-xl font-semibold text-center w-full">
                        No material set
                    </div>
                    <div className="font-thin">
                        Drag and drop a material asset here.
                    </div>
                </div>
            </div>
        );
    }

    private async _handleAssetDropped(ev: DragEvent<HTMLDivElement>): Promise<void> {
        this.setState({ assetDragOver: false });

        const assets = ev.dataTransfer.getData("assets");
        if (!assets) {
            return;
        }

        const assetAbsolutePath = JSON.parse(assets)[0] as string;
        const extension = extname(assetAbsolutePath).toLowerCase();

        if (extension !== ".material") {
            return;
        }

        await this._loadMaterialFromPath(assetAbsolutePath);

        decalsConfiguration.materialPath = assetAbsolutePath;
    }

    private async _loadMaterialFromPath(path: string): Promise<void> {
        const data = await readJSON(path);
        const scene = this.props.editor.layout.preview.scene;

        let material = scene.getMaterialById(data.id);
        if (!material) {
            material = await loadImportedMaterial(scene, path);
        }

        this.setState({ material });
    }

    private _disposeTemporaryDecalMesh(): void {
        this._decalMesh?.dispose(true, false);
        this._decalMesh = null;
    }

    private _handleMouseMove(offsetX: number, offsetY: number): void {
        if (!this.state.material || !this.state.ctrlOrMetaKeyDown) {
            return;
        }

        this._disposeTemporaryDecalMesh();

        const scene = this.props.editor.layout.preview.scene;
        const pick = scene.pick(offsetX, offsetY, (m) => !m.metadata?.decal, false);

        if (pick.pickedMesh && pick.pickedPoint) {
            EditorDecalsInspector._lastPickedMesh = pick.pickedMesh;
            EditorDecalsInspector._lastPickedNormal = pick.getNormal(true, true);

            EditorDecalsInspector._lastPickPosition = pick.pickedPoint.clone();

            this._handleUpdateCurrentDecalMesh();
        }
    }

    private _handleUpdateCurrentDecalMesh(): void {
        if (
            !EditorDecalsInspector._lastPickedMesh ||
            !EditorDecalsInspector._lastPickPosition ||
            !this.state.material
        ) {
            return;
        }

        this._disposeTemporaryDecalMesh();

        this._decalMesh = MeshBuilder.CreateDecal("decal", EditorDecalsInspector._lastPickedMesh, {
            localMode: true,
            size: decalsConfiguration.size,
            angle: decalsConfiguration.angle,
            position: EditorDecalsInspector._lastPickPosition,
            normal: EditorDecalsInspector._lastPickedNormal ?? undefined,
        });

        this._decalMesh.receiveShadows = true;
        this._decalMesh.visibility = this.state.ctrlOrMetaKeyDown ? 1 : 0.35;

        setMeshMetadataNotSerializable(this._decalMesh, true);

        if (this.state.material.zOffset === 0) {
            this.state.material.zOffset = -2;
        }

        this._decalMesh.material = this.state.material;
    }

    private _handleMouseDown(ev: MouseEvent): void {
        this._mouseDownPosition.set(ev.offsetX, ev.offsetY);
    }

    private _handleMouseUp(event: MouseEvent): void {
        if (!this.state.material || !this.state.ctrlOrMetaKeyDown) {
            return;
        }

        const distance = Vector2.Distance(
            this._mouseDownPosition,
            new Vector2(event.offsetX, event.offsetY),
        );

        if (distance > 2) {
            return;
        }

        this._handleMouseMove(event.offsetX, event.offsetY);

        if (this._decalMesh) {
            this._decalMesh.id = Tools.RandomId();
            this._decalMesh.name = this.state.material!.name;
            this._decalMesh.uniqueId = UniqueNumber.Get();

            this._decalMesh.metadata = {
                decal: {
                    angle: decalsConfiguration.angle,
                    size: decalsConfiguration.size.asArray(),
                    meshId: EditorDecalsInspector._lastPickedMesh?.name,
                    position: EditorDecalsInspector._lastPickPosition?.asArray(),
                    normal: EditorDecalsInspector._lastPickedNormal?.asArray(),
                },
            };

            setMeshMetadataNotSerializable(this._decalMesh, false);

            this.props.editor.layout.graph.refresh();
        }

        this._decalMesh = null;
    }
}
